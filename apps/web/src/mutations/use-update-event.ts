import { eventKeys, eventMutationKeys, myKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import type { EventInput } from "@/mutations/use-create-event";

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.update(),
    mutationFn: async ({ id, ...values }: EventInput & { id: string }) => {
      const response = await api.events[":id"].$patch({ param: { id }, json: values });

      if (!response.ok) throw await apiError(response, "Could not save the event.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
