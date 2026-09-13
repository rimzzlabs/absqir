import type { Translate } from "@absqir/i18n";

interface ClientError {
  code?: string | undefined;
  message?: string | undefined;
}

/**
 * Better Auth guards sensitive changes behind a fresh session: one read
 * less than an hour ago. Its own wording is terse, so it gets a sentence
 * that says what to do.
 */
export function authErrorMessage(t: Translate, error: ClientError | null, fallback: string): Error {
  if (error?.code === "SESSION_NOT_FRESH") {
    return new Error(t("errors:sessionNotFresh"));
  }

  return new Error(error?.message || fallback);
}
