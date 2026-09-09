import type { Database } from "@absqir/db";

/**
 * Worker bindings the API needs. The web app owns wrangler.jsonc, so this
 * describes only the subset the API reads. The generated Env satisfies it.
 */
export interface HyperdriveBinding {
  connectionString: string;
}

export interface RateLimitBinding {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

export interface ApiBindings {
  HYPERDRIVE: HyperdriveBinding;
  /**
   * A process-lifetime drizzle instance. The Node runtime sets it, so every
   * request shares one pool. Workers cannot carry a connection across
   * requests, so it stays unset there and each invocation opens its own
   * short-lived pool through HYPERDRIVE.
   */
  SHARED_DB?: Database;
  API_RATE_LIMIT?: RateLimitBinding;
  BETTER_AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  ENVIRONMENT?: string;
  ENABLE_DOCS?: string;
  REGISTRATION_OPEN?: string;
  SECURE_COOKIES?: string;
  CRON_SECRET?: string;
  APP_URL?: string;
  /**
   * OAuth keys. A provider is on when both of its keys are set, and absent
   * everywhere when they are not: no button, and no route to start the flow.
   */
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}
