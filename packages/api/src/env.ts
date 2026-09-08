import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import type { ApiBindings } from "@/bindings";

const schema = z
  .object({
    BETTER_AUTH_SECRET: z.string().min(32),
    /** Required in production: sign-up and invitations travel by email. */
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).default("absqir <onboarding@resend.dev>"),
    ENVIRONMENT: z.enum(["development", "preview", "production"]).default("development"),
    /** Serve the OpenAPI document and the Scalar page. Off in production. */
    ENABLE_DOCS: z.stringbool().optional(),
    /**
     * Opens the "create an organization" door for every account. Off by
     * default: only the operator and promoted accounts create organizations.
     * Joining through an invitation never needs this.
     */
    REGISTRATION_OPEN: z.stringbool().default(false),
    /**
     * Overrides the Secure flag on cookies. Defaults to on in production.
     * A self-host without TLS must set this to false, or sign-in fails
     * silently when the browser drops the cookie.
     */
    SECURE_COOKIES: z.stringbool().optional(),
    /**
     * Turns on POST /api/tick for a scheduler outside the app. Unset, the
     * route answers 404 and only the in-process timer runs the heartbeat.
     */
    CRON_SECRET: z.string().min(16).optional(),
    /**
     * Where a link in an email points when no request supplies an origin,
     * as in the heartbeat. Set it on every deployment that sends email.
     */
    APP_URL: z.url().optional(),
  })
  .check((ctx) => {
    if (ctx.value.ENVIRONMENT === "production" && !ctx.value.RESEND_API_KEY) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value.RESEND_API_KEY,
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required in production: sign-up codes travel by email.",
      });
    }
  });

function build(bindings: ApiBindings) {
  return createEnv({
    server: schema.shape,
    runtimeEnv: {
      BETTER_AUTH_SECRET: bindings.BETTER_AUTH_SECRET,
      RESEND_API_KEY: bindings.RESEND_API_KEY,
      EMAIL_FROM: bindings.EMAIL_FROM,
      ENVIRONMENT: bindings.ENVIRONMENT,
      ENABLE_DOCS: bindings.ENABLE_DOCS,
      REGISTRATION_OPEN: bindings.REGISTRATION_OPEN,
      SECURE_COOKIES: bindings.SECURE_COOKIES,
      CRON_SECRET: bindings.CRON_SECRET,
      APP_URL: bindings.APP_URL,
    },
    emptyStringAsUndefined: true,
    createFinalSchema: () => schema,
  });
}

export type ApiEnv = ReturnType<typeof build>;

// Bindings are one object per isolate, so the parse runs once, not per request.
const parsed = new WeakMap<ApiBindings, ApiEnv>();

export function parseEnv(bindings: ApiBindings) {
  const hit = parsed.get(bindings);
  if (hit) return hit;

  const env = build(bindings);
  parsed.set(bindings, env);

  return env;
}

export function isProduction(env: ApiEnv) {
  return env.ENVIRONMENT === "production";
}

export function docsEnabled(env: ApiEnv) {
  return env.ENABLE_DOCS ?? !isProduction(env);
}

export function secureCookies(env: ApiEnv) {
  return env.SECURE_COOKIES ?? isProduction(env);
}
