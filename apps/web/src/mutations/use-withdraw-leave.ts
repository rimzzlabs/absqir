import { leaveKeys, leaveMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Withdraws a pending request. */
export function useWithdrawLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: leaveMutationKeys.withdraw(),
    mutationFn: async (id: string) => {
      const response = await api.my.leave[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not withdraw the request.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}
