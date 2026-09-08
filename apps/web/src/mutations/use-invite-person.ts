import { organizationKeys, peopleKeys, peopleMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface InvitePersonInput {
  id: string;
  role: "member" | "organizer" | "admin";
}

export function useInvitePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: peopleMutationKeys.invite(),
    mutationFn: async ({ id, role }: InvitePersonInput) => {
      const response = await api.people[":id"].invite.$post({ param: { id }, json: { role } });

      if (!response.ok) throw await apiError(response, "Could not send the invitation.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
