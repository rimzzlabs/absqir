import { scheduleKeys, scheduleMutationKeys, sessionListKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useRemoveSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: scheduleMutationKeys.remove(),
    mutationFn: async (id: string) => {
      const response = await api.schedules[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not delete the schedule.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionListKeys.all });
    },
  });
}
