import { eventKeys, scheduleKeys, scheduleMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useRemoveSchedule() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: scheduleMutationKeys.remove(),
    mutationFn: async (id: string) => {
      const response = await api.schedules[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotDeleteSchedule"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
