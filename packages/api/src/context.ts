import { type Auth, createAuth, OTP_EXPIRES_IN_SECONDS } from "@absqir/auth";
import { createDb, type Database } from "@absqir/db";
import { createMailer, type Mailer } from "@absqir/transactional";
import { match, P } from "ts-pattern";
import type { ApiBindings } from "#src/bindings";
import { type ApiEnv, parseEnv, secureCookies, socialProviderKeys } from "#src/env";

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
  return match(env.RESEND_API_KEY)
    .with(P.string.minLength(1), (RESEND_API_KEY) =>
      createMailer({
        apiKey: RESEND_API_KEY,
        from: env.EMAIL_FROM,
        appUrl: env.APP_URL ?? origin,
      }),
    )
    .otherwise(() => null);
}

/** Loopback, link-local, and the three private IPv4 blocks. */
function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  if (!parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)) return false;

  const [a, b] = parts.map(Number) as [number, number, number, number];

  return (
    a === 127 ||
    a === 10 ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31)
  );
}

/**
 * True for an address that can only be reached from this machine or this
 * network: a laptop, or a phone on the same wifi.
 */
function isLocalHost(hostname: string): boolean {
  // URL keeps an IPv6 host in brackets. Strip them before the name checks.
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  return (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    isPrivateIpv4(host)
  );
}

/**
 * The addresses allowed to post to the API. Production trusts the one address
 * the server answers on, and nothing else.
 *
 * A dev server cannot know that address. The Workers dev runtime rewrites the
 * request URL to `https://localhost`, which drops the port and the host the
 * browser really used, so a laptop on :4321 and a phone on the LAN both look
 * foreign and every sign-in is refused. Development therefore also trusts the
 * address the browser states, as long as that address is on this network.
 *
 * The check stays real for anything published: a page on the open internet
 * cannot talk to a developer's machine this way. Never widen this past a
 * private address.
 */
export function trustedOriginsFor(
  env: ApiEnv,
  origin: string,
  requestOrigin?: string | null,
): string[] {
  if (env.ENVIRONMENT !== "development" || !requestOrigin) return [origin];

  // A header is whatever the caller typed. Only a real, local origin joins.
  const stated = URL.parse(requestOrigin);
  if (!stated || !isLocalHost(stated.hostname)) return [origin];

  return match(stated.origin === origin)
    .with(true, () => [origin])
    .otherwise(() => [origin, stated.origin]);
}

/**
 * One database pool and one auth instance for one Worker invocation.
 * Both the Hono app and the Astro middleware build their context here, so a
 * page render and an API call agree on how a session is read.
 */
export function createRequestContext(
  bindings: ApiBindings,
  origin: string,
  /** The browser's own Origin header. Development trusts it; see above. */
  requestOrigin?: string | null,
): RequestContext {
  const env = parseEnv(bindings);

  const { db, close } = match(bindings.SHARED_DB)
    .with(P.nullish, () => createDb({ connectionString: bindings.HYPERDRIVE.connectionString }))
    .otherwise((SHARED_DB) => ({ db: SHARED_DB, close: async () => {} }));

  const mailer = createMailerFor(env, origin);

  const auth = createAuth({
    db,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: origin,
    trustedOrigins: trustedOriginsFor(env, origin, requestOrigin),
    useSecureCookies: secureCookies(env),
    registrationOpen: env.REGISTRATION_OPEN,
    enforceRateLimit: env.ENVIRONMENT !== "development",
    socialProviders: socialProviderKeys(env),
    // The provider redirects back to the one address the operator registered.
    // The request origin can differ from it, behind a proxy or under a second
    // hostname, and the provider refuses a callback it does not know.
    callbackOrigin: env.APP_URL ?? origin,
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
