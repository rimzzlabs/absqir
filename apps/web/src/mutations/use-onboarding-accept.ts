import { authMutationKeys, meKeys, onboardingKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Accepts an invitation and finishes onboarding. Also used by the invite page. */
export function useOnboardingAccept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...authMutationKeys.onboarding(), "accept"],
    mutationFn: async (invitationId: string) => {
      const response = await api.onboarding.accept.$post({ json: { invitationId } });

      if (!response.ok) throw await apiError(response, "Could not accept the invitation.");

      return response.json();
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: onboardingKeys.all });
      queryClient.removeQueries({ queryKey: meKeys.all });
      window.location.assign("/");
    },
  });
}
