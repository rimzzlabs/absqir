import { type ApiBindings, type RateLimitBinding, startTickerFor } from "@absqir/api";
import { createDb } from "@absqir/db";
import type { AppRuntime } from "@/lib/runtime/runtime-types";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 120;
const SWEEP_THRESHOLD = 10_000;

interface WindowState {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window limiter for a single Node process, mirroring the Cloudflare
 * rate limit binding's 120 requests per minute. A multi-node deployment needs
 * a shared store instead; one instance is the self-host baseline.
 */
function createMemoryRateLimit(): RateLimitBinding {
  const windows = new Map<string, WindowState>();

  return {
    limit: async ({ key }) => {
      const now = Date.now();

      if (windows.size > SWEEP_THRESHOLD) {
        for (const [entryKey, entry] of windows) {
          if (entry.resetAt <= now) windows.delete(entryKey);
        }
      }

      const current = windows.get(key);

      if (!current || current.resetAt <= now) {
        windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return { success: true };
      }

      current.count += 1;
      return { success: current.count <= MAX_REQUESTS_PER_WINDOW };
    },
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
}

let cached: AppRuntime | undefined;

export function getRuntime(_locals: App.Locals): AppRuntime {
  if (cached) return cached;

  const connectionString = requireEnv("DATABASE_URL");

  // One pool for the whole process. Workers must open a pool per invocation;
  // a long-running Node server must not.
  const poolMax = Number(process.env.DATABASE_POOL_MAX ?? "10");
  const { db } = createDb({ connectionString, max: poolMax });

  const bindings: ApiBindings = {
    HYPERDRIVE: { connectionString },
    SHARED_DB: db,
    BETTER_AUTH_SECRET: requireEnv("BETTER_AUTH_SECRET"),
    API_RATE_LIMIT: createMemoryRateLimit(),
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    ENVIRONMENT: process.env.ENVIRONMENT ?? "production",
    ENABLE_DOCS: process.env.ENABLE_DOCS,
    REGISTRATION_OPEN: process.env.REGISTRATION_OPEN,
    SECURE_COOKIES: process.env.SECURE_COOKIES,
    CRON_SECRET: process.env.CRON_SECRET,
    APP_URL: process.env.APP_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };

  const runtime: AppRuntime = {
    bindings,
    executionCtx: {
      waitUntil: (promise) => {
        promise.catch((error: unknown) => console.error(error));
      },
      passThroughOnException: () => {},
      props: {},
    },
  };

  cached = runtime;

  // One process, one heartbeat: schedules spawn, ended sessions close, and
  // reminders go out without anyone opening a page.
  startTickerFor(bindings, db);

  return runtime;
}
