import { joinRequestMutationKeys, onboardingKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Takes back the open request, so the account can ask somewhere else. */
export function useWithdrawJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: joinRequestMutationKeys.withdraw(),
    mutationFn: async () => {
      const response = await api["join-requests"].mine.$delete();

      if (!response.ok) throw await apiError(response, "Could not withdraw the request.");

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
    },
  });
}
