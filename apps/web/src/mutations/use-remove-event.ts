import { eventKeys, eventMutationKeys, myKeys, organizationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useRemoveEvent() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.remove(),
    mutationFn: async (id: string) => {
      const response = await api.events[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotDeleteEvent"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
