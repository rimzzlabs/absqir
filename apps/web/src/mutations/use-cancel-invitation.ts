import { organizationKeys, organizationMutationKeys, peopleKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.cancelInvitation(),
    mutationFn: async (invitationId: string) => {
      const { error } = await authClient.organization.cancelInvitation({ invitationId });

      if (error) {
        throw new Error(error.message ?? "Could not cancel the invitation.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}
