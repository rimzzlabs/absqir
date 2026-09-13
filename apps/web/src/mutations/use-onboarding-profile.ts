import { authMutationKeys, meKeys, onboardingKeys } from "@absqir/core/query-keys";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface OnboardingProfileInput {
  name: string;
  password?: string;
  /** The language this account reads absqir in from here on. */
  locale: Locale;
}

export function useOnboardingProfile() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...authMutationKeys.onboarding(), "profile"],
    mutationFn: async (values: OnboardingProfileInput) => {
      const response = await api.onboarding.profile.$post({ json: values });

      if (!response.ok) throw await apiError(response, t("errors:couldNotSaveProfile"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
      void queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}
