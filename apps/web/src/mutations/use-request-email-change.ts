import { accountMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error";

/** Sends the 6 digit code to the new address. Nothing changes until it is entered. */
export function useRequestEmailChange() {
  const t = useTranslate();
  return useMutation({
    mutationKey: accountMutationKeys.requestEmailChange(),
    mutationFn: async (newEmail: string) => {
      const { error } = await authClient.emailOtp.requestEmailChange({ newEmail });

      if (error) throw authErrorMessage(t, error, t("errors:couldNotSendCode"));
    },
  });
}
