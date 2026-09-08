import { organizationKeys, organizationMutationKeys, peopleKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.removeMember(),
    mutationFn: async (memberIdOrEmail: string) => {
      const { error } = await authClient.organization.removeMember({ memberIdOrEmail });

      if (error) {
        throw new Error(error.message ?? "Could not remove the member.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}
