import { authMutationKeys, meKeys, onboardingKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface OnboardingProfileInput {
  name: string;
  password?: string;
}

export function useOnboardingProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...authMutationKeys.onboarding(), "profile"],
    mutationFn: async (values: OnboardingProfileInput) => {
      const response = await api.onboarding.profile.$post({ json: values });

      if (!response.ok) throw await apiError(response, "Could not save the profile.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
      void queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}
