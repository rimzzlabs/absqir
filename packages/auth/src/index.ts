import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const ONE_HOUR = 60 * 60;
const ONE_DAY = ONE_HOUR * 24;

export interface VerificationEmail {
  user: { email: string; name: string };
  url: string;
}

export interface CreateAuthOptions {
  db: Database;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  /** Turn on for https deployments. Cross-site cookies need Secure to be set. */
  useSecureCookies?: boolean;
  /** Omit to keep email verification off, for example in local development. */
  sendVerificationEmail?: (email: VerificationEmail) => Promise<unknown>;
}

export function createAuth(options: CreateAuthOptions) {
  const { db, secret, baseURL, trustedOrigins, sendVerificationEmail } = options;
  const useSecureCookies = options.useSecureCookies ?? false;

  return betterAuth({
    secret,
    baseURL,
    trustedOrigins,
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: sendVerificationEmail !== undefined,
    },
    emailVerification: sendVerificationEmail
      ? {
          sendOnSignUp: true,
          autoSignInAfterVerification: true,
          sendVerificationEmail: async ({ user, url }) => {
            await sendVerificationEmail({ user: { email: user.email, name: user.name }, url });
          },
        }
      : undefined,
    /*
     * Rolling session. There is no separate refresh token: the session cookie
     * is the credential, and reading it renews it.
     *
     * - expiresIn  the session dies this long after its last renewal.
     * - updateAge  once a session is older than this, the next read pushes
     *              expiresAt out to now + expiresIn and re-sets the cookie.
     * - freshAge   sensitive changes, such as a new password, need a session
     *              read more recently than this.
     *
     * So an active reader is never signed out, and an idle one has 30 days.
     */
    session: {
      expiresIn: ONE_DAY * 30,
      updateAge: ONE_DAY,
      freshAge: ONE_HOUR,
      // Signed cookie cache: most reads skip the database entirely.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // Blocks credential stuffing. Better Auth counts per IP and per path.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: ONE_HOUR, max: 10 },
        "/forget-password": { window: ONE_HOUR, max: 5 },
      },
    },
    advanced: {
      useSecureCookies,
      defaultCookieAttributes: useSecureCookies
        ? { httpOnly: true, secure: true, sameSite: "none", partitioned: true }
        : { httpOnly: true, secure: false, sameSite: "lax" },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
