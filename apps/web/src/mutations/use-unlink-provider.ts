import { accountKeys, accountMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error";

/**
 * Removes one provider from the account. Better Auth refuses the last way in,
 * so nobody can lock themselves out from here.
 */
export function useUnlinkProvider() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: accountMutationKeys.unlinkProvider(),
    mutationFn: async (accountId: string) => {
      const { error } = await authClient.unlinkAccount({ accountId });

      if (error) throw authErrorMessage(t, error, t("errors:couldNotDisconnectAccount"));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.credentials() });
    },
  });
}
