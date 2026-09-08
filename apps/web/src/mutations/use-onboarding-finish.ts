import { authMutationKeys, meKeys, onboardingKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Ends onboarding without an organization. */
export function useOnboardingFinish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...authMutationKeys.onboarding(), "finish"],
    mutationFn: async () => {
      const response = await api.onboarding.finish.$post();

      if (!response.ok) throw await apiError(response, "Could not finish onboarding.");

      return response.json();
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: onboardingKeys.all });
      queryClient.removeQueries({ queryKey: meKeys.all });
      window.location.assign("/");
    },
  });
}
