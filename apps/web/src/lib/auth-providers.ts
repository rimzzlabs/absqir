import type { Translate } from "@absqir/i18n";
import { match, P } from "ts-pattern";
/** The providers this build knows, in the order the buttons appear. */
export const AUTH_PROVIDERS = ["github", "google"] as const;

export type AuthProviderId = (typeof AUTH_PROVIDERS)[number];

const LABELS: Record<AuthProviderId, string> = { github: "GitHub", google: "Google" };

export function isAuthProvider(value: string): value is AuthProviderId {
  return (AUTH_PROVIDERS as readonly string[]).includes(value);
}

export function providerLabel(t: Translate, provider: AuthProviderId | null): string {
  return match(provider)
    .with(P.string.minLength(1), (provider) => LABELS[provider])
    .otherwise(() => t("auth:providers.fallbackName"));
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
export function readCallbackError(
  t: Translate,
  params: {
    code: string | null;
    description: string | null;
    provider: AuthProviderId | null;
  },
): CallbackError | null {
  if (!params.code) return null;

  const code = params.code.toLowerCase();
  const provider = providerLabel(t, params.provider);
  const email = emailIn(params.description);

  if (code === NO_INVITATION) {
    return {
      needsInvitation: true,
      email,
      message: match(email)
        .with(P.string.minLength(1), (email) =>
          t("auth:callback.noInvitationWithEmail", { provider, email }),
        )
        .otherwise(() => t("auth:callback.noInvitation", { provider })),
    };
  }

  const generic = (message: string): CallbackError => ({
    needsInvitation: false,
    email: null,
    message,
  });

  switch (code) {
    case "access_denied":
      return generic(t("auth:callback.accessDenied", { provider }));
    case "email_does_not_match":
      return generic(t("auth:callback.emailMismatch", { provider }));
    case "account_already_linked_to_different_user":
      return generic(t("auth:callback.alreadyLinked", { provider }));
    case "unable_to_link_account":
      return generic(t("auth:callback.unableToLink", { provider }));
    case "email_not_found":
      return generic(t("auth:callback.emailNotFound", { provider }));
    case "email_not_verified":
      return generic(t("auth:callback.emailNotVerified", { provider }));
    default:
      return generic(t("auth:callback.unknown", { provider }));
  }
}
