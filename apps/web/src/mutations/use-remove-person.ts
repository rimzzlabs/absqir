import { organizationKeys, peopleKeys, peopleMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useRemovePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: peopleMutationKeys.remove(),
    mutationFn: async (id: string) => {
      const response = await api.people[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not remove the person.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
