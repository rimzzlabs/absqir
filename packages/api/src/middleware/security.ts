import type { Context, MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import { isProduction, parseEnv } from "@/env";
import type { AppEnv } from "@/types";

const MAX_BODY_BYTES = 64 * 1024;
const DOCS_PATHS = new Set(["/api/reference", "/api/openapi.json"]);
const CDN_ORIGIN = "https://cdn.jsdelivr.net";
const HSTS = "max-age=63072000; includeSubDomains; preload";

function apiHeaders(production: boolean) {
  // The API answers with JSON only, so every fetch directive is denied. A denied
  // default-src is the cheapest defence against a reflected payload that some
  // browser decides to render.
  return secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
    crossOriginOpenerPolicy: "same-origin",
    crossOriginResourcePolicy: "same-origin",
    referrerPolicy: "no-referrer",
    strictTransportSecurity: production ? HSTS : false,
    xContentTypeOptions: "nosniff",
    xFrameOptions: "DENY",
    xPermittedCrossDomainPolicies: "none",
    removePoweredBy: true,
    permissionsPolicy: { camera: [], microphone: [], geolocation: [], payment: [] },
  });
}

function docsHeaders(production: boolean) {
  // Scalar renders real markup and pulls its bundle from a CDN, so the docs page
  // needs a wider policy than the JSON routes.
  return secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", CDN_ORIGIN],
      styleSrc: ["'self'", "'unsafe-inline'", CDN_ORIGIN],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:", CDN_ORIGIN],
      connectSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
    referrerPolicy: "no-referrer",
    strictTransportSecurity: production ? HSTS : false,
    xContentTypeOptions: "nosniff",
    xFrameOptions: "DENY",
    removePoweredBy: true,
  });
}

export function securityHeaders(): MiddlewareHandler<AppEnv> {
  return (c, next) => {
    const production = isProduction(parseEnv(c.env));

    if (DOCS_PATHS.has(c.req.path)) {
      return docsHeaders(production)(c, next);
    }

    return apiHeaders(production)(c, next);
  };
}

// The site and the API share one origin, so a request from another origin has
// no business here. This blocks the form posts that skip the CORS preflight.
export function csrfPolicy(): MiddlewareHandler<AppEnv> {
  return csrf();
}

export function payloadLimit(): MiddlewareHandler<AppEnv> {
  return bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => c.json({ error: "Payload too large" }, 413),
  });
}

// Cloudflare sets CF-Connecting-IP at the edge, so a client cannot forge it.
// On the Node target the reverse proxy sets X-Forwarded-For; the docs tell
// operators not to expose the app port directly.
function clientKey(c: Context<AppEnv>) {
  const cfIp = c.req.header("cf-connecting-ip");
  if (cfIp) return cfIp;

  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";

  return "unknown";
}

export function rateLimit(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const limiter = c.env.API_RATE_LIMIT;

    if (!limiter) {
      await next();
      return;
    }

    const { success } = await limiter.limit({ key: clientKey(c) });

    if (!success) {
      return c.json({ error: "Too many requests" }, 429);
    }

    await next();
  };
}
