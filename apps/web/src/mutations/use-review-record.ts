import { eventKeys, eventMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface ReviewRecordInput {
  eventId: string;
  personId: string;
}

/**
 * Marks a flagged check-in as looked at. The signals stay on the record, so
 * clearing the flag says an organizer read them and let it stand, which is
 * itself worth keeping. To reject the check-in, mark the person absent.
 */
export function useReviewRecord() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.review(),
    mutationFn: async ({ eventId, personId }: ReviewRecordInput) => {
      const response = await api.events[":id"].records[":personId"].review.$post({
        param: { id: eventId, personId },
      });

      if (!response.ok) throw await apiError(response, t("errors:couldNotClearFlag"));

      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.records(variables.eventId) });
    },
  });
}
