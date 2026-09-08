import { accountMutationKeys } from "@absqir/core/query-keys";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error";

/** Sends the 6 digit code to the new address. Nothing changes until it is entered. */
export function useRequestEmailChange() {
  return useMutation({
    mutationKey: accountMutationKeys.requestEmailChange(),
    mutationFn: async (newEmail: string) => {
      const { error } = await authClient.emailOtp.requestEmailChange({ newEmail });

      if (error) throw authErrorMessage(error, "Could not send the code.");
    },
  });
}
