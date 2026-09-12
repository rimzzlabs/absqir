import { eventKeys, leaveKeys, leaveMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface DecideLeaveInput {
  id: string;
  decision: "approved" | "declined";
  note: string | null;
}

/** Approve or decline. An approval writes an excused record. */
export function useDecideLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: leaveMutationKeys.decide(),
    mutationFn: async ({ id, ...values }: DecideLeaveInput) => {
      const response = await api.leave[":id"].decide.$post({ param: { id }, json: values });

      if (!response.ok) throw await apiError(response, "Could not save the decision.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
