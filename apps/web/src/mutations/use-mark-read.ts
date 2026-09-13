import { notificationKeys, notificationMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Null marks every unread notification of mine read. */
export function useMarkRead() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: notificationMutationKeys.read(),
    mutationFn: async (ids: string[] | null) => {
      const response = await api.notifications.read.$post({ json: { ids } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotMarkThemRead"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
