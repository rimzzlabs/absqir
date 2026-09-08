import { authMutationKeys, meKeys, onboardingKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useOnboardingAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...authMutationKeys.onboarding(), "avatar"],
    mutationFn: async (image: string | null) => {
      const response = await api.onboarding.avatar.$post({ json: { image } });

      if (!response.ok) throw await apiError(response, "Could not save the picture.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
      void queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}
