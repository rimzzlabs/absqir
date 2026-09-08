import { organizationKeys, organizationMutationKeys, peopleKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface InviteMemberInput {
  email: string;
  role: "member" | "organizer" | "admin";
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.invite(),
    mutationFn: async ({ email, role }: InviteMemberInput) => {
      const { data, error } = await authClient.organization.inviteMember({
        email,
        // The client type only knows the stock roles; the server knows ours.
        role: role as "member",
        resend: true,
      });

      if (error || !data) {
        throw new Error(error?.message ?? "Could not send the invitation.");
      }

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}
