import { authMutationKeys, meKeys, onboardingKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface OnboardingOrganizationInput {
  name: string;
  slug: string;
}

/** Creates the first organization and finishes onboarding. */
export function useOnboardingOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...authMutationKeys.onboarding(), "organization"],
    mutationFn: async (values: OnboardingOrganizationInput) => {
      const response = await api.onboarding.organization.$post({ json: values });

      if (!response.ok) throw await apiError(response, "Could not create the organization.");

      return response.json();
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: onboardingKeys.all });
      queryClient.removeQueries({ queryKey: meKeys.all });
      window.location.assign("/");
    },
  });
}
