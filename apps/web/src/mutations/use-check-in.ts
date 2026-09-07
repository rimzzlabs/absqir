import { attendanceMutationKeys } from "@absqir/core/query-keys";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CheckInValues } from "@/lib/attendance-schemas";

export interface CheckInParams extends CheckInValues {
  sessionId: string;
  token: string;
}

export function useCheckIn() {
  return useMutation({
    mutationKey: attendanceMutationKeys.checkIn(),
    mutationFn: async (params: CheckInParams) => {
      const response = await api["check-in"].$post({ json: params });

      if (!response.ok) {
        const body = await response.json();
        const message = "error" in body ? body.error : "Could not check in.";
        throw new Error(message);
      }

      return response.json();
    },
  });
}
