import { groupKeys, groupMutationKeys, organizationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface CreateGroupInput {
  name: string;
  description: string | null;
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: groupMutationKeys.create(),
    mutationFn: async (values: CreateGroupInput) => {
      const response = await api.groups.$post({ json: values });

      if (!response.ok) throw await apiError(response, "Could not create the group.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
