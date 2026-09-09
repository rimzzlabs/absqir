import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import { ensurePersonForUser } from "@absqir/db/people";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { emailOTP, organization } from "better-auth/plugins";
import { and, count, eq, gt } from "drizzle-orm";
import { ac, roles } from "@/roles";

const ONE_MINUTE = 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;

export const OTP_LENGTH = 6;
export const OTP_EXPIRES_IN_SECONDS = 10 * ONE_MINUTE;

export type OtpPurpose = "sign-in" | "email-verification" | "forget-password" | "change-email";

/** The providers this build knows. Each one is off until its keys are set. */
export const SOCIAL_PROVIDERS = ["github", "google"] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDERS)[number];

export interface SocialProviderKeys {
  clientId: string;
  clientSecret: string;
}

export type SocialProviderKeyMap = Partial<Record<SocialProviderId, SocialProviderKeys>>;

/** The code the sign-up door throws with. The sign-in page maps it to its own copy. */
export const NO_INVITATION_CODE = "NO_INVITATION";

export interface OtpEmail {
  email: string;
  otp: string;
  type: OtpPurpose;
}

export interface InvitationEmail {
  email: string;
  invitationId: string;
  organizationName: string;
  inviterName: string;
  role: string;
}

/** The cookie the public event page sets before it sends a visitor to sign in. */
export const EVENT_COOKIE = "absqir-event";

function cookieValue(header: string | null | undefined, name: string): string | null {
  if (!header) return null;

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }

  return null;
}

export interface CreateAuthOptions {
  db: Database;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  /** Turn on for https deployments. Cross-site cookies need Secure to be set. */
  useSecureCookies?: boolean;
  /**
   * The "create an organization" door. When false, only the first account and
   * accounts the operator promoted can create organizations. Sign-up itself
   * stays open for anyone who holds an invitation.
   */
  registrationOpen?: boolean;
  /** Delivers the 6 digit code. Required: sign-up cannot finish without it. */
  sendOtp: (email: OtpEmail) => Promise<void>;
  /** Delivers the invitation link. */
  sendInvitation: (email: InvitationEmail) => Promise<void>;
  /**
   * Per-IP limits on sign-in and code endpoints. Off in local development,
   * where every request shares one bucket and a test run trips it.
   */
  enforceRateLimit?: boolean;
  /**
   * The provider keys the operator set. A provider that is absent here never
   * reaches the page: no button, and no route to start the flow.
   */
  socialProviders?: SocialProviderKeyMap;
  /**
   * The origin a provider redirects back to. It must stay the one string the
   * operator registered with GitHub or Google, so it cannot follow the
   * request the way baseURL does. Defaults to baseURL.
   */
  callbackOrigin?: string;
}

/**
 * The provider hands back a picture as a remote URL. An avatar here is a
 * small data URL this instance stores itself, so the URL is dropped and the
 * reader picks a picture during onboarding.
 */
const dropProviderImage = () => ({ image: undefined });

/**
 * The providers that hold both keys, each pinned to the callback the
 * operator registered. Default scopes already ask for the email and nothing
 * else, so none are added.
 */
function socialProvidersFor(options: CreateAuthOptions): BetterAuthOptions["socialProviders"] {
  const keys = options.socialProviders ?? {};
  const origin = options.callbackOrigin ?? options.baseURL;
  const callback = (id: SocialProviderId) => `${origin}/api/auth/callback/${id}`;

  return {
    ...(keys.github && {
      github: {
        ...keys.github,
        redirectURI: callback("github"),
        mapProfileToUser: dropProviderImage,
      },
    }),
    ...(keys.google && {
      google: {
        ...keys.google,
        redirectURI: callback("google"),
        // Google signs a reader in as whichever account the browser holds.
        // This asks which one, which is what a shared machine needs.
        prompt: "select_account" as const,
        mapProfileToUser: dropProviderImage,
      },
    }),
  };
}

export function createAuth(options: CreateAuthOptions) {
  const { db, secret, baseURL, trustedOrigins, sendOtp, sendInvitation } = options;
  const useSecureCookies = options.useSecureCookies ?? false;
  const registrationOpen = options.registrationOpen ?? false;
  const enforceRateLimit = options.enforceRateLimit ?? true;

  return betterAuth({
    secret,
    baseURL,
    trustedOrigins,
    basePath: "/api/auth",
    socialProviders: socialProvidersFor(options),
    account: {
      accountLinking: {
        enabled: true,
        // Both providers return an address they verified themselves, so the
        // same address is the same person. Without this, a reader who signed
        // up by email and then pressed a provider button would end up with a
        // second account, and the directory keys people on the address.
        trustedProviders: [...SOCIAL_PROVIDERS],
        allowDifferentEmails: false,
      },
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        organization: schema.organization,
        member: schema.member,
        invitation: schema.invitation,
      },
    }),
    user: {
      additionalFields: {
        onboardingStep: {
          type: "string",
          required: false,
          defaultValue: "profile",
          input: false,
        },
        canCreateOrganizations: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
        notificationChannel: {
          type: "string",
          required: false,
          defaultValue: "all",
          input: false,
        },
        timezone: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    plugins: [
      organization({
        ac,
        roles,
        creatorRole: "owner",
        invitationExpiresIn: ONE_DAY * 7,
        cancelPendingInvitationsOnReInvite: true,
        allowUserToCreateOrganization: (user) =>
          registrationOpen || user.canCreateOrganizations === true,
        sendInvitationEmail: async (data) => {
          await sendInvitation({
            email: data.email,
            invitationId: data.id,
            organizationName: data.organization.name,
            inviterName: data.inviter.user.name,
            role: data.role,
          });
        },
        organizationHooks: {
          // Every member is also a person in the directory. An imported or
          // invited row under the same email is claimed here.
          afterAcceptInvitation: async ({ organization: org, user }) => {
            await ensurePersonForUser(db, {
              organizationId: org.id,
              userId: user.id,
              name: user.name,
              email: user.email,
            });
          },
          afterCreateOrganization: async ({ organization: org, user }) => {
            await ensurePersonForUser(db, {
              organizationId: org.id,
              userId: user.id,
              name: user.name,
              email: user.email,
            });
          },
        },
      }),
      emailOTP({
        otpLength: OTP_LENGTH,
        expiresIn: OTP_EXPIRES_IN_SECONDS,
        allowedAttempts: 5,
        // The one-door flow verifies every new email with a code, so the
        // link-based verification email is never sent.
        overrideDefaultEmailVerification: true,
        // The account page: a code to the new address proves it is theirs.
        changeEmail: { enabled: true },
        sendVerificationOTP: async ({ email, otp, type }) => {
          await sendOtp({ email, otp, type });
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          // The sign-up door. The first account is the operator. After that,
          // an account needs an invitation unless the operator opened
          // registration. The operator gets the "create organization" right.
          before: async (user, context) => {
            const [row] = await db.select({ value: count() }).from(schema.user);
            const firstUser = (row?.value ?? 0) === 0;

            if (firstUser) {
              return { data: { ...user, canCreateOrganizations: true } };
            }

            if (registrationOpen) return;

            // The third door: an open session's public page. The page sets a
            // cookie with the session id; the session must still take people.
            const eventId = cookieValue(context?.headers?.get("cookie"), EVENT_COOKIE);

            if (eventId) {
              const open = await db
                .select({ id: schema.attendanceSession.id })
                .from(schema.attendanceSession)
                .where(
                  and(
                    eq(schema.attendanceSession.id, eventId),
                    eq(schema.attendanceSession.registrationOpen, true),
                    gt(schema.attendanceSession.endsAt, new Date()),
                  ),
                )
                .limit(1);

              if (open[0]) return;
            }

            const invited = await db
              .select({ id: schema.invitation.id })
              .from(schema.invitation)
              .where(
                and(
                  eq(schema.invitation.email, user.email.toLowerCase()),
                  eq(schema.invitation.status, "pending"),
                ),
              )
              .limit(1);

            if (!invited[0]) {
              // The code is what makes the OAuth callback redirect to the
              // sign-in page. Without one, Better Auth serves a raw 403.
              // The address is in the message because a provider can hand
              // back one the reader did not expect, and naming it is the
              // only way they can act on the refusal.
              throw new APIError("FORBIDDEN", {
                code: NO_INVITATION_CODE,
                message: `${user.email} has no invitation. Ask an organizer to invite you.`,
              });
            }
          },
        },
      },
      session: {
        create: {
          // A fresh sign-in lands on the first membership, so no page has to
          // handle a session without an active organization.
          before: async (session) => {
            const memberships = await db
              .select({ organizationId: schema.member.organizationId })
              .from(schema.member)
              .where(eq(schema.member.userId, session.userId))
              .orderBy(schema.member.createdAt)
              .limit(1);

            return {
              data: { ...session, activeOrganizationId: memberships[0]?.organizationId ?? null },
            };
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      // New accounts prove their email with the code before they exist.
      requireEmailVerification: false,
    },
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
      cookieCache: { enabled: true, maxAge: 5 * ONE_MINUTE },
    },
    // Blocks credential stuffing and code guessing. Per IP and per path.
    rateLimit: {
      enabled: enforceRateLimit,
      window: ONE_MINUTE,
      max: 100,
      customRules: {
        "/sign-in/email": { window: ONE_MINUTE, max: 5 },
        "/sign-up/email": { window: ONE_HOUR, max: 10 },
        "/email-otp/send-verification-otp": { window: ONE_MINUTE, max: 3 },
        "/sign-in/email-otp": { window: ONE_MINUTE, max: 5 },
        "/sign-in/social": { window: ONE_MINUTE, max: 10 },
        "/email-otp/reset-password": { window: ONE_MINUTE, max: 5 },
        "/forget-password": { window: ONE_HOUR, max: 5 },
        "/email-otp/request-email-change": { window: ONE_MINUTE, max: 3 },
        "/email-otp/change-email": { window: ONE_MINUTE, max: 5 },
        "/change-password": { window: ONE_MINUTE, max: 5 },
      },
    },
    advanced: {
      // Cloudflare sets the first header at the edge; a reverse proxy in
      // front of the Node image sets the second.
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
      useSecureCookies,
      defaultCookieAttributes: useSecureCookies
        ? { httpOnly: true, secure: true, sameSite: "none", partitioned: true }
        : { httpOnly: true, secure: false, sameSite: "lax" },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];

/** The status and message Better Auth attached, or null for any other error. */
export function authErrorOf(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof APIError)) return null;

  const status = typeof error.statusCode === "number" ? error.statusCode : 400;
  const message = error.body?.message ?? error.message;

  return { status, message };
}

export { ac, isRoleName, ROLE_NAMES, type RoleName, roleAtLeast, roles } from "@/roles";
