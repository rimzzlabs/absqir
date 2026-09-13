import { eventKeys, scheduleKeys, scheduleMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface ScheduleInput {
  title: string;
  description: string | null;
  frequency: "daily" | "weekly";
  weekdays: number[];
  startTime: string;
  durationMinutes: number;
  lateAfterMinutes: number;
  opensBeforeMinutes: number;
  timezone: string;
  startsOn: string;
  endsOn: string | null;
  active: boolean;
  allowWalkIns: boolean;
  /** A saved place every event this rule spawns inherits. Null clears it. */
  locationId: string | null;
  requireLocation: boolean;
  groupIds: string[];
}

export function useCreateSchedule() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: scheduleMutationKeys.create(),
    mutationFn: async (values: ScheduleInput) => {
      const response = await api.schedules.$post({ json: values });

      if (!response.ok) throw await apiError(response, t("errors:couldNotCreateSchedule"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
