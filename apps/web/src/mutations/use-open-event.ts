import { eventKeys, eventMutationKeys, myKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useOpenEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.open(),
    mutationFn: async (id: string) => {
      const response = await api.events[":id"].open.$post({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not open the event.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
