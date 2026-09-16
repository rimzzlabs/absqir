import type { Translate } from "@absqir/i18n";
import { match } from "ts-pattern";

interface ClientError {
  code?: string | undefined;
  message?: string | undefined;
}

/**
 * Better Auth writes its own messages. They arrive in English whatever
 * language the reader picked, and they state a verdict without a way out.
 * A code named here gets an absqir sentence instead. Anything else keeps
 * the message the server sent, because it is the only detail there is.
 */
export function authErrorMessage(t: Translate, error: ClientError | null, fallback: string): Error {
  return match(error?.code)
    .with("SESSION_NOT_FRESH", () => new Error(t("errors:sessionNotFresh")))
    .with(
      "YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION",
      "USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION",
      () => new Error(t("errors:notAMemberOfThisOrganization")),
    )
    .with("NO_ACTIVE_ORGANIZATION", () => new Error(t("errors:noOrganizationMembership")))
    .with("ORGANIZATION_NOT_FOUND", () => new Error(t("errors:notFound")))
    .otherwise(() => new Error(error?.message || fallback));
}
