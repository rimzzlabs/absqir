import { defineMiddleware } from "astro:middleware";
import { createRequestContext } from "@absqir/api";
import { isRoleName } from "@absqir/auth";
import { schema } from "@absqir/db";
import { isOnboardingStep } from "@absqir/db/schema";
import { getRuntime } from "@app-runtime";
import { A } from "@mobily/ts-belt";
import { eq } from "drizzle-orm";

/** The single sign-in door. A signed-in reader is sent to the dashboard. */
const SIGN_IN_PATH = "/sign-in";

/** Reachable without a session. */
function isPublicPath(path: string): boolean {
  return (
    path === SIGN_IN_PATH ||
    path === "/sign-up" ||
    path.startsWith("/invite/") ||
    path.startsWith("/e/")
  );
}

/**
 * Reachable by a signed-in reader who has no organization yet. The home page
 * shows the steps that lead into one; settings holds the account's own
 * profile, preferences, and devices, none of which need an organization.
 */
function isOrgFreePath(path: string): boolean {
  return (
    path === "/" ||
    path === "/settings" ||
    path === "/onboarding" ||
    path.startsWith("/invite/") ||
    path.startsWith("/e/")
  );
}

/** The event id in a public event path, or null. */
function eventIdOf(path: string): string | null {
  const match = /^\/e\/([^/]+)$/.exec(path);
  return match?.[1] ?? null;
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

  // One door. The old sign-up address still works, it just lands on it.
  if (path === "/sign-up") {
    return context.redirect(`${SIGN_IN_PATH}${context.url.search}`, 302);
  }

  const runtime = getRuntime(context.locals);
  const { auth, db, close } = createRequestContext(
    runtime.bindings,
    context.url.origin,
    context.request.headers.get("origin"),
  );

  context.locals.user = null;
  context.locals.session = null;
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
    const onboardingStep = isOnboardingStep(user.onboardingStep) ? user.onboardingStep : "profile";

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
      isRoleName(row.role) ? [{ ...row, logo: row.logo ?? null, role: row.role }] : [],
    );

    const activeMembership =
      A.getBy(memberships, (row) => row.organizationId === session.activeOrganizationId) ??
      memberships[0] ??
      null;

    context.locals.user = user;
    context.locals.session = session;
    context.locals.onboardingStep = onboardingStep;
    context.locals.memberships = memberships;
    context.locals.activeMembership = activeMembership;

    if (path === SIGN_IN_PATH) {
      return context.redirect("/", 302);
    }

    // Onboarding first. The invitation id rides along so step 3 can accept it.
    // A public event page sends its own id, so step 3 registers instead.
    if (onboardingStep !== "done" && path !== "/onboarding" && !path.startsWith("/invite/")) {
      const eventId = eventIdOf(path);
      const search = eventId ? `?event=${encodeURIComponent(eventId)}` : context.url.search;

      return context.redirect(`/onboarding${search}`, 302);
    }

    if (onboardingStep === "done" && path === "/onboarding") {
      return context.redirect("/", 302);
    }

    // The old waiting room folded into the home page.
    if (path === "/no-organization") {
      return context.redirect("/", 302);
    }

    if (memberships.length === 0 && !isOrgFreePath(path)) {
      return context.redirect("/", 302);
    }

    return withNoStore(await next());
  } finally {
    runtime.executionCtx.waitUntil(close());
  }
});

/** A page rendered for one reader must never sit in a shared cache. */
function withNoStore(response: Response): Response {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
