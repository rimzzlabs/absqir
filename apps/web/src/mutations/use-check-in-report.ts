import {
  checkInReportKeys,
  checkInReportMutationKeys,
  eventKeys,
  myKeys,
} from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface SendReportInput {
  eventId: string;
  message: string;
  /** The refused attempt. The server takes the latest one when this is null. */
  attemptId: string | null;
}

/** The member's own report that the place check was wrong about them. */
export function useSendCheckInReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: checkInReportMutationKeys.create(),
    mutationFn: async ({ eventId, message, attemptId }: SendReportInput) => {
      const response = await api.events[":id"]["check-in-report"].$post({
        param: { id: eventId },
        json: { message, attemptId },
      });

      if (!response.ok) throw await apiError(response, "Could not send the report.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkInReportKeys.all });
    },
  });
}

export interface DecideReportInput {
  id: string;
  approve: boolean;
  note: string | null;
}

/**
 * The organizer's decision. An approval writes the attendance record, so
 * every view of that event and of the member's own events goes stale.
 */
export function useDecideCheckInReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: checkInReportMutationKeys.decide(),
    mutationFn: async ({ id, approve, note }: DecideReportInput) => {
      const response = await api["check-in-reports"][":id"].decide.$post({
        param: { id },
        json: { approve, note },
      });

      if (!response.ok) throw await apiError(response, "Could not save the decision.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkInReportKeys.all });
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
