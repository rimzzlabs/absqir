import { groupKeys, groupMutationKeys, peopleKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface UpdateGroupInput {
  id: string;
  name: string;
  description: string | null;
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: groupMutationKeys.update(),
    mutationFn: async ({ id, ...values }: UpdateGroupInput) => {
      const response = await api.groups[":id"].$patch({ param: { id }, json: values });

      if (!response.ok) throw await apiError(response, "Could not save the group.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.all });
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}
