import { type Auth, createAuth, OTP_EXPIRES_IN_SECONDS } from "@absqir/auth";
import { createDb, type Database } from "@absqir/db";
import { createMailer, type Mailer } from "@absqir/transactional";
import type { ApiBindings } from "@/bindings";
import { type ApiEnv, parseEnv, secureCookies } from "@/env";

export interface RequestContext {
  db: Database;
  auth: Auth;
  /** Null when the instance has no RESEND_API_KEY. Then nothing is emailed. */
  mailer: Mailer | null;
  /** Pass to ctx.waitUntil so the pool is released after the response. */
  close: () => Promise<void>;
}

/**
 * Outside production the mailer is optional: codes and links go to the
 * server log instead, which is what a developer wants on a laptop.
 *
 * The origin is the fallback for APP_URL. It reaches the templates as the
 * base for the brand mark and the notification preference link, so a
 * self-host that never set APP_URL still renders both against itself.
 */
export function createMailerFor(env: ApiEnv, origin: string): Mailer | null {
  return env.RESEND_API_KEY
    ? createMailer({
        apiKey: env.RESEND_API_KEY,
        from: env.EMAIL_FROM,
        appUrl: env.APP_URL ?? origin,
      })
    : null;
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

  const mailer = createMailerFor(env, origin);

  const auth = createAuth({
    db,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: origin,
    trustedOrigins: [origin],
    useSecureCookies: secureCookies(env),
    registrationOpen: env.REGISTRATION_OPEN,
    enforceRateLimit: env.ENVIRONMENT !== "development",
    sendOtp: async ({ email, otp, type }) => {
      if (!mailer) {
        console.log(`[absqir mail] code for ${email} (${type}): ${otp}`);
        return;
      }

      await mailer.sendOtp(email, {
        code: otp,
        purpose: type,
        expiresInMinutes: OTP_EXPIRES_IN_SECONDS / 60,
      });
    },
    sendInvitation: async (invitation) => {
      const acceptUrl = `${origin}/invite/${invitation.invitationId}`;

      if (!mailer) {
        console.log(`[absqir mail] invitation for ${invitation.email}: ${acceptUrl}`);
        return;
      }

      await mailer.sendInvitation(invitation.email, {
        organizationName: invitation.organizationName,
        inviterName: invitation.inviterName,
        role: invitation.role,
        acceptUrl,
      });
    },
  });

  return { db, auth, mailer, close };
}
