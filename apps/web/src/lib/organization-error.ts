import { isSlugTakenCode, SLUG_RESERVED } from "@absqir/core/org-path";
import type { Translate } from "@absqir/i18n";
import { match, P } from "ts-pattern";

/** What Better Auth hands back when a call fails. */
export interface AuthError {
  code?: string;
  message?: string;
}

/**
 * The failure in the reader's own language. Better Auth answers in English
 * with a code, and the slug failures are the two a reader meets often
 * enough to deserve words they can act on.
 */
export function organizationErrorMessage(params: {
  t: Translate;
  error: AuthError | null;
  fallback: string;
}): string {
  const { t, error } = params;

  return match(error)
    .with(P.nullish, () => params.fallback)
    .with({ message: SLUG_RESERVED }, () => t("errors:slugReserved"))
    .with({ code: P.when(isSlugTakenCode) }, () => t("errors:slugTaken"))
    .otherwise((error) =>
      match(error.message)
        .with(P.string.minLength(1), (message) => message)
        .otherwise(() => params.fallback),
    );
}
