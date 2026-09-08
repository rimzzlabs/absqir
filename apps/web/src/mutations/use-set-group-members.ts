import { groupKeys, groupMutationKeys, peopleKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface SetGroupMembersInput {
  id: string;
  personIds: string[];
}

export function useSetGroupMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: groupMutationKeys.setMembers(),
    mutationFn: async ({ id, personIds }: SetGroupMembersInput) => {
      const response = await api.groups[":id"].members.$put({ param: { id }, json: { personIds } });

      if (!response.ok) throw await apiError(response, "Could not save the group members.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.all });
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}
