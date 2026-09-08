import { organizationKeys, organizationMutationKeys, peopleKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface UpdateMemberRoleInput {
  memberId: string;
  role: "owner" | "admin" | "organizer" | "member";
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.updateMemberRole(),
    mutationFn: async ({ memberId, role }: UpdateMemberRoleInput) => {
      const { error } = await authClient.organization.updateMemberRole({
        memberId,
        // The client type only knows the stock roles; the server knows ours.
        role: role as "member",
      });

      if (error) {
        throw new Error(error.message ?? "Could not change the role.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}
