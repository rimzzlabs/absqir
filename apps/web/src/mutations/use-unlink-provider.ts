import { accountKeys, accountMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error";

/**
 * Removes one provider from the account. Better Auth refuses the last way in,
 * so nobody can lock themselves out from here.
 */
export function useUnlinkProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: accountMutationKeys.unlinkProvider(),
    mutationFn: async (accountId: string) => {
      const { error } = await authClient.unlinkAccount({ accountId });

      if (error) throw authErrorMessage(error, "Could not disconnect that account.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.credentials() });
    },
  });
}
