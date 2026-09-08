import { accountKeys, accountMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error";

/** Signs out one other device. Null signs out every device but this one. */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: accountMutationKeys.revokeSession(),
    mutationFn: async (token: string | null) => {
      const { error } = token
        ? await authClient.revokeSession({ token })
        : await authClient.revokeOtherSessions();

      if (error) throw authErrorMessage(error, "Could not sign that device out.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.devices() });
    },
  });
}
