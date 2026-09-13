import { match, P } from "ts-pattern";
/** The providers this build knows, in the order the buttons appear. */
export const AUTH_PROVIDERS = ["github", "google"] as const;

export type AuthProviderId = (typeof AUTH_PROVIDERS)[number];

const LABELS: Record<AuthProviderId, string> = { github: "GitHub", google: "Google" };

export function isAuthProvider(value: string): value is AuthProviderId {
  return (AUTH_PROVIDERS as readonly string[]).includes(value);
}

export function providerLabel(provider: AuthProviderId | null): string {
  return match(provider)
    .with(P.string.minLength(1), (provider) => LABELS[provider])
    .otherwise(() => "The provider");
}

/**
 * The instance refused the address. Everything else failed on the way there.
 * The sign-up door in packages/auth throws this code, and Better Auth puts it
 * in the address bar, so the comparison below lowercases what it finds.
 */
export const NO_INVITATION = "no_invitation";

export interface CallbackError {
  /** The address needs an invitation, so the closed card explains it. */
  needsInvitation: boolean;
  message: string;
  /** The address the provider returned, once it passed the check below. */
  email: string | null;
}

const EMAIL_PATTERN = /[^\s<>@]+@[^\s<>@.]+\.[^\s<>@]+/;
const MAX_EMAIL_LENGTH = 254;

/**
 * The one address inside the server's message, or null. Everything in the
 * address bar is written by whoever made the link, so nothing from it is
 * rendered as prose: only a token that reads as an email survives.
 */
function emailIn(description: string | null): string | null {
  const found = description?.match(EMAIL_PATTERN)?.[0] ?? null;

  return match(Boolean(found && found.length <= MAX_EMAIL_LENGTH))
    .with(true, () => found)
    .otherwise(() => null);
}

/**
 * The copy for a failed provider round trip. The page owns every sentence,
 * because `error` and `error_description` arrive in the address bar and a
 * sign-in page that prints a stranger's sentence is a phishing surface.
 */
export function readCallbackError(params: {
  code: string | null;
  description: string | null;
  provider: AuthProviderId | null;
}): CallbackError | null {
  if (!params.code) return null;

  const code = params.code.toLowerCase();
  const name = providerLabel(params.provider);
  const email = emailIn(params.description);

  if (code === NO_INVITATION) {
    return {
      needsInvitation: true,
      email,
      message: match(email)
        .with(
          P.string.minLength(1),
          (email) => `${name} signed you in as ${email}. That address has no invitation here.`,
        )
        .otherwise(() => `The address ${name} returned has no invitation here.`),
    };
  }

  const generic = (message: string): CallbackError => ({
    needsInvitation: false,
    email: null,
    message,
  });

  switch (code) {
    case "access_denied":
      return generic(`The ${name} sign-in was cancelled.`);
    case "email_does_not_match":
      return generic(`That ${name} account uses a different address than this account.`);
    case "account_already_linked_to_different_user":
      return generic(`That ${name} account already belongs to someone else here.`);
    case "unable_to_link_account":
      return generic(`absqir could not link that ${name} account.`);
    case "email_not_found":
      return generic(`${name} shared no address. Add one there, then try again.`);
    case "email_not_verified":
      return generic(`${name} has not verified that address yet.`);
    default:
      return generic(`The ${name} sign-in did not finish. Try again, or use your email.`);
  }
}
