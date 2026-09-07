import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import type { ApiBindings } from "@/bindings";

function build(bindings: ApiBindings) {
  return createEnv({
    server: {
      BETTER_AUTH_SECRET: z.string().min(32),
      RESEND_API_KEY: z.string().min(1).optional(),
      EMAIL_FROM: z.string().min(1).default("absqir <onboarding@resend.dev>"),
      ENVIRONMENT: z.enum(["development", "preview", "production"]).default("development"),
      /** Serve the OpenAPI document and the Scalar page. Off in production. */
      ENABLE_DOCS: z.stringbool().optional(),
    },
    runtimeEnv: {
      BETTER_AUTH_SECRET: bindings.BETTER_AUTH_SECRET,
      RESEND_API_KEY: bindings.RESEND_API_KEY,
      EMAIL_FROM: bindings.EMAIL_FROM,
      ENVIRONMENT: bindings.ENVIRONMENT,
      ENABLE_DOCS: bindings.ENABLE_DOCS,
    },
    emptyStringAsUndefined: true,
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
