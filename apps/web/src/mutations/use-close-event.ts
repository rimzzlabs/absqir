import { eventKeys, eventMutationKeys, myKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useCloseEvent() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.close(),
    mutationFn: async (id: string) => {
      const response = await api.events[":id"].close.$post({ param: { id } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotCloseEvent"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
