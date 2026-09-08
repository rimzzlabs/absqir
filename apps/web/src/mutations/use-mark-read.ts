import { notificationKeys, notificationMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Null marks every unread notification of mine read. */
export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: notificationMutationKeys.read(),
    mutationFn: async (ids: string[] | null) => {
      const response = await api.notifications.read.$post({ json: { ids } });

      if (!response.ok) throw await apiError(response, "Could not mark them read.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
