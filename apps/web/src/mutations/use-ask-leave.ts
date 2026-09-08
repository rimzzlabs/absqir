import { leaveKeys, leaveMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface AskLeaveInput {
  sessionId: string;
  reason: string;
}

/** A member asks to be excused from an event. */
export function useAskLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: leaveMutationKeys.ask(),
    mutationFn: async (values: AskLeaveInput) => {
      const response = await api.my.leave.$post({ json: values });

      if (!response.ok) throw await apiError(response, "Could not send the request.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}
