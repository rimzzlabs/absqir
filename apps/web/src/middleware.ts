import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { createRequestContext } from "@absqir/api";

/** Pages for signing in. A signed-in reader is sent back to the dashboard. */
const AUTH_PATHS = new Set(["/sign-in", "/sign-up"]);

/** A check-in page opens from a scanned QR code, so it never needs a session. */
function isPublicPath(path: string): boolean {
  return AUTH_PATHS.has(path) || path.startsWith("/a/");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Hono owns /api and builds its own context there.
  if (path.startsWith("/api")) {
    return next();
  }

  const { auth, close } = createRequestContext(env, context.url.origin);

  try {
    // This call also renews a session that has passed its updateAge, which is
    // what keeps a returning reader signed in without a new password.
    const data = await auth.api.getSession({ headers: context.request.headers });

    context.locals.user = data?.user ?? null;
    context.locals.session = data?.session ?? null;

    if (!data && !isPublicPath(path)) {
      const next = encodeURIComponent(path + context.url.search);
      return context.redirect(`/sign-in?next=${next}`, 302);
    }

    if (data && AUTH_PATHS.has(path)) {
      return context.redirect("/", 302);
    }

    const response = await next();

    // A page rendered for one reader must never sit in a shared cache.
    response.headers.set("Cache-Control", "private, no-store");

    return response;
  } finally {
    const cf = context.locals.cfContext;

    if (cf) {
      cf.waitUntil(close());
    } else {
      await close();
    }
  }
});
