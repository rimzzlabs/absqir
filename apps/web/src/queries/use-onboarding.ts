import { onboardingKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useOnboarding() {
  const t = useTranslate();
  return useQuery({
    queryKey: onboardingKeys.status(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.onboarding.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotReadOnboardingStatus"));

      return response.json();
    },
  });
}

export type OnboardingStatus = NonNullable<ReturnType<typeof useOnboarding>["data"]>;
