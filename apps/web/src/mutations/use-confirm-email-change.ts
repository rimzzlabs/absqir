import { accountMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error";

export interface ConfirmEmailChangeInput {
  newEmail: string;
  code: string;
}

/** The right code swaps the address and refreshes the cookie; the page reloads to match. */
export function useConfirmEmailChange() {
  const t = useTranslate();
  return useMutation({
    mutationKey: accountMutationKeys.confirmEmailChange(),
    mutationFn: async ({ newEmail, code }: ConfirmEmailChangeInput) => {
      const { error } = await authClient.emailOtp.changeEmail({ newEmail, otp: code });

      if (error) throw authErrorMessage(t, error, t("errors:codeDidNotMatch"));
    },
    onSuccess: () => {
      window.location.reload();
    },
  });
}
