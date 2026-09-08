import { scheduleKeys, scheduleMutationKeys, sessionListKeys } from "@absqir/core/query-keys";
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
  groupIds: string[];
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: scheduleMutationKeys.create(),
    mutationFn: async (values: ScheduleInput) => {
      const response = await api.schedules.$post({ json: values });

      if (!response.ok) throw await apiError(response, "Could not create the schedule.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionListKeys.all });
    },
  });
}
