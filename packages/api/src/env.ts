import { SOCIAL_PROVIDERS, type SocialProviderId, type SocialProviderKeyMap } from "@absqir/auth";
import { A } from "@mobily/ts-belt";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import type { ApiBindings } from "#src/bindings";

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
    /**
     * OAuth keys. Both keys of a pair, or neither: a provider that holds one
     * half is a typo, and the only symptom would be a button that never
     * appears. Unset means the provider stays off and the sign-in page looks
     * exactly as it does without this feature.
     */
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
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

    const pairs = [
      ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
      ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    ] as const;

    for (const [idKey, secretKey] of pairs) {
      const id = ctx.value[idKey];
      const secret = ctx.value[secretKey];

      if (Boolean(id) === Boolean(secret)) continue;

      const missing = id ? secretKey : idKey;
      const present = id ? idKey : secretKey;

      ctx.issues.push({
        code: "custom",
        input: ctx.value[missing],
        path: [missing],
        message: `${missing} is required when ${present} is set.`,
      });
    }
  });

function build(bindings: ApiBindings) {
  return createEnv({
    server: schema.shape,
    runtimeEnv: {
      BETTER_AUTH_SECRET: bindings.BETTER_AUTH_SECRET,
      GITHUB_CLIENT_ID: bindings.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: bindings.GITHUB_CLIENT_SECRET,
      GOOGLE_CLIENT_ID: bindings.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: bindings.GOOGLE_CLIENT_SECRET,
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

/**
 * The providers the operator turned on. The parse above already refused a
 * half-set pair, so a present id means a present secret.
 */
export function socialProviderKeys(env: ApiEnv): SocialProviderKeyMap {
  const keys: SocialProviderKeyMap = {};

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    keys.github = { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
  }

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    keys.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
  }

  return keys;
}

/** The provider ids a page renders a button for, in a stable order. */
export function enabledSocialProviders(bindings: ApiBindings): readonly SocialProviderId[] {
  const keys = socialProviderKeys(parseEnv(bindings));

  return A.filter(SOCIAL_PROVIDERS, (provider) => keys[provider] !== undefined);
}
