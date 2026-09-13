import { leaveKeys, leaveMutationKeys, myKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface AskLeaveInput {
  eventId: string;
  reason: string;
}

/** A member asks to be excused from an event. */
export function useAskLeave() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: leaveMutationKeys.ask(),
    mutationFn: async (values: AskLeaveInput) => {
      const response = await api.my.leave.$post({ json: values });

      if (!response.ok) throw await apiError(response, t("errors:couldNotSendRequest"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      // Each of my events carries its own request, so the cards refresh too.
      void queryClient.invalidateQueries({ queryKey: myKeys.events() });
    },
  });
}
