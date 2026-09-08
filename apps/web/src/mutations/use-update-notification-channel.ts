import { accountMutationKeys } from "@absqir/core/query-keys";
import type { NotificationChannel } from "@absqir/db/schema";
import { useMutation } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Where notifications reach me. The server answers with what it stored. */
export function useUpdateNotificationChannel() {
  return useMutation({
    mutationKey: accountMutationKeys.notificationChannel(),
    mutationFn: async (channel: NotificationChannel) => {
      const response = await api.me.notifications.$patch({ json: { channel } });

      if (!response.ok) throw await apiError(response, "Could not save that choice.");

      return response.json();
    },
  });
}
