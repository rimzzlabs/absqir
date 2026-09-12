import { eventKeys, eventMutationKeys, myKeys, organizationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useRemoveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.remove(),
    mutationFn: async (id: string) => {
      const response = await api.events[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not delete the event.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
