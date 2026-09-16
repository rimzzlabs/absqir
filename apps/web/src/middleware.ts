import { defineMiddleware } from "astro:middleware";
import { createRequestContext } from "@absqir/api";
import { isRoleName } from "@absqir/auth";
import {
  isAccountPath,
  isOrgFreePath,
  isPublicPath,
  orgPath,
  SIGN_IN_PATH,
  splitOrgPath,
} from "@absqir/core/org-path";
import { isSlug } from "@absqir/core/slug";
import { schema } from "@absqir/db";
import { isOnboardingStep } from "@absqir/db/schema";
import { DEFAULT_LOCALE, isLocale, localeFromHeader } from "@absqir/i18n";
import { getRuntime } from "@app-runtime";
import { A } from "@mobily/ts-belt";
import { eq } from "drizzle-orm";
import { match, P } from "ts-pattern";

/**
 * Where this browser remembers the language of the account that last used
 * it. The sign-in page has no session to ask, so without this it would fall
 * back to whatever the operating system asks for, and a reader who chose
 * Bahasa Indonesia inside absqir would meet an English door on the way back.
 */
const LOCALE_COOKIE = "locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The event id in a public event path, or null. */
function eventIdOf(path: string): string | null {
  const parts = /^\/e\/([^/]+)$/.exec(path);
  return parts?.[1] ?? null;
}

function safeNext(url: URL): string {
  const next = url.pathname + url.search;
  return encodeURIComponent(next);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Hono owns /api and builds its own context there.
  if (path.startsWith("/api")) {
    return next();
  }

  // Astro serves its own build output and its image endpoint under /_. None
  // of it is a page, so the organization rules below never apply.
  if (path.startsWith("/_")) {
    return next();
  }

  // One door. The old sign-up address still works, it just lands on it.
  if (path === "/sign-up") {
    return context.redirect(`${SIGN_IN_PATH}${context.url.search}`, 302);
  }

  const runtime = getRuntime(context.locals);
  const { auth, db, close } = createRequestContext(
    runtime.bindings,
    context.url.origin,
    context.request.headers.get("origin"),
    context.request.headers.get("accept-language"),
  );

  // What this browser last read in, then what the operating system asks
  // for. A signed-in account overrides both below.
  const remembered = match(context.cookies.get(LOCALE_COOKIE)?.value)
    .with(P.when(isLocale), (locale) => locale)
    .otherwise(() => null);
  const askedLocale =
    remembered ??
    localeFromHeader(context.request.headers.get("accept-language")) ??
    DEFAULT_LOCALE;

  context.locals.user = null;
  context.locals.session = null;
  context.locals.locale = askedLocale;
  context.locals.onboardingStep = null;
  context.locals.memberships = [];
  context.locals.activeMembership = null;

  try {
    // This call also renews a session that has passed its updateAge, which is
    // what keeps a returning reader signed in without a new password.
    const data = await auth.api.getSession({ headers: context.request.headers });

    if (!data) {
      if (!isPublicPath(path)) {
        return context.redirect(`${SIGN_IN_PATH}?next=${safeNext(context.url)}`, 302);
      }

      return withNoStore(await next());
    }

    const { user, session } = data;
    const onboardingStep = match(user.onboardingStep)
      .with(P.when(isOnboardingStep), (onboardingStep) => onboardingStep)
      .otherwise(() => "profile" as const);

    const rows = await db
      .select({
        organizationId: schema.member.organizationId,
        name: schema.organization.name,
        slug: schema.organization.slug,
        logo: schema.organization.logo,
        role: schema.member.role,
      })
      .from(schema.member)
      .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
      .where(eq(schema.member.userId, user.id))
      .orderBy(schema.member.createdAt);

    const memberships = A.flatMap(rows, (row) =>
      match(row.role)
        .with(P.when(isRoleName), (role) => [{ ...row, logo: row.logo ?? null, role }])
        .otherwise(() => []),
    );

    const sessionMembership =
      A.getBy(memberships, (row) => row.organizationId === session.activeOrganizationId) ??
      memberships[0] ??
      null;

    const chosen = match(user.locale)
      .with(P.when(isLocale), (locale) => locale)
      .otherwise(() => null);

    // An account that has chosen leaves the choice on the browser, so the
    // sign-in page speaks it the next time this person comes back.
    if (chosen !== null && chosen !== remembered) {
      context.cookies.set(LOCALE_COOKIE, chosen, {
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
        sameSite: "lax",
        secure: context.url.protocol === "https:",
      });
    }

    context.locals.user = user;
    context.locals.session = session;
    context.locals.locale = chosen ?? askedLocale;
    context.locals.onboardingStep = onboardingStep;
    context.locals.memberships = memberships;
    context.locals.activeMembership = sessionMembership;

    if (path === SIGN_IN_PATH) {
      return context.redirect("/", 302);
    }

    // Onboarding first. The invitation id rides along so step 3 can accept it.
    // A public event page sends its own id, so step 3 registers instead.
    if (onboardingStep !== "done" && path !== "/onboarding" && !path.startsWith("/invite/")) {
      const eventId = eventIdOf(path);
      const search = match(eventId)
        .with(P.string.minLength(1), (eventId) => `?event=${encodeURIComponent(eventId)}`)
        .otherwise(() => context.url.search);

      return context.redirect(`/onboarding${search}`, 302);
    }

    if (onboardingStep === "done" && path === "/onboarding") {
      return context.redirect("/", 302);
    }

    // The old waiting room folded into the home page.
    if (path === "/no-organization") {
      return context.redirect("/", 302);
    }

    if (memberships.length === 0) {
      // Nothing under an organization address exists for this reader yet.
      if (!isOrgFreePath(path)) return context.redirect("/", 302);

      return withNoStore(await next());
    }

    // The root is not a page for a reader who has an organization. It is the
    // way in to the one the session last used.
    if (path === "/") {
      const landing = sessionMembership ?? memberships[0];

      return context.redirect(orgPath(landing.slug, "/") + context.url.search, 302);
    }

    if (isAccountPath(path)) {
      return withNoStore(await next());
    }

    // Every address left carries the slug in front. The address decides which
    // organization the page shows, not the session, so two tabs on two
    // organizations never fight over one value.
    const parts = splitOrgPath(path);

    if (!parts || !isSlug(parts.slug)) {
      return notFound(context);
    }

    const membership = A.getBy(memberships, (row) => row.slug === parts.slug);

    // An organization this reader does not belong to reads the same as one
    // that does not exist. A different answer would tell a stranger which
    // organizations absqir holds.
    if (!membership) {
      return notFound(context);
    }

    context.locals.activeMembership = membership;

    // The API reads the organization from the session, so the address has to
    // write it there before the page asks for any data.
    const switched = await match(membership.organizationId === session.activeOrganizationId)
      .with(true, () => Promise.resolve<readonly string[]>([]))
      .otherwise(async () => {
        const result = await auth.api.setActiveOrganization({
          body: { organizationId: membership.organizationId },
          headers: context.request.headers,
          returnHeaders: true,
        });

        return result.headers?.getSetCookie() ?? [];
      });

    return withCookies(withNoStore(await next()), switched);
  } finally {
    runtime.executionCtx.waitUntil(close());
  }
});

/** The 404 page, with the status that belongs to it. */
async function notFound(context: { rewrite: (path: string) => Promise<Response> }) {
  const response = await context.rewrite("/404");

  return withNoStore(new Response(response.body, { status: 404, headers: response.headers }));
}

/** A page rendered for one reader must never sit in a shared cache. */
function withNoStore(response: Response): Response {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/** Carries a refreshed session cookie onto the page the reader asked for. */
function withCookies(response: Response, cookies: readonly string[]): Response {
  for (const value of cookies) {
    response.headers.append("Set-Cookie", value);
  }

  return response;
}
