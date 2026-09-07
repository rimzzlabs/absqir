import { type Auth, createAuth } from "@absqir/auth";
import { createDb, type Database } from "@absqir/db";
import { createMailer } from "@absqir/transactional";
import type { ApiBindings } from "@/bindings";
import { parseEnv, secureCookies } from "@/env";

export interface RequestContext {
  db: Database;
  auth: Auth;
  /** Pass to ctx.waitUntil so the pool is released after the response. */
  close: () => Promise<void>;
}

/**
 * One database pool and one auth instance for one Worker invocation.
 * Both the Hono app and the Astro middleware build their context here, so a
 * page render and an API call agree on how a session is read.
 */
export function createRequestContext(bindings: ApiBindings, origin: string): RequestContext {
  const env = parseEnv(bindings);

  const { db, close } = bindings.SHARED_DB
    ? { db: bindings.SHARED_DB, close: async () => {} }
    : createDb({ connectionString: bindings.HYPERDRIVE.connectionString });

  const mailer = env.RESEND_API_KEY
    ? createMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM })
    : null;

  const auth = createAuth({
    db,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: origin,
    trustedOrigins: [origin],
    useSecureCookies: secureCookies(env),
    registrationOpen: env.REGISTRATION_OPEN,
    sendVerificationEmail: mailer
      ? ({ user, url }) => mailer.sendWelcome(user.email, { name: user.name, verifyUrl: url })
      : undefined,
  });

  return { db, auth, close };
}
