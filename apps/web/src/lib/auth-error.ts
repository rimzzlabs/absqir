interface ClientError {
  code?: string | undefined;
  message?: string | undefined;
}

/**
 * Better Auth guards sensitive changes behind a fresh session: one read
 * less than an hour ago. Its own wording is terse, so it gets a sentence
 * that says what to do.
 */
export function authErrorMessage(error: ClientError | null, fallback: string): Error {
  if (error?.code === "SESSION_NOT_FRESH") {
    return new Error("You signed in a while ago. Sign out, sign in again, then retry this.");
  }

  return new Error(error?.message || fallback);
}
