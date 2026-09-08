import { scheduleKeys, scheduleMutationKeys, sessionListKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import type { ScheduleInput } from "@/mutations/use-create-schedule";

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: scheduleMutationKeys.update(),
    mutationFn: async ({ id, ...values }: ScheduleInput & { id: string }) => {
      const response = await api.schedules[":id"].$patch({ param: { id }, json: values });

      if (!response.ok) throw await apiError(response, "Could not save the schedule.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionListKeys.all });
    },
  });
}
