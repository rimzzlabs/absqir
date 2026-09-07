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
  API_RATE_LIMIT?: RateLimitBinding;
  BETTER_AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  ENVIRONMENT?: string;
  ENABLE_DOCS?: string;
  REGISTRATION_OPEN?: string;
}
