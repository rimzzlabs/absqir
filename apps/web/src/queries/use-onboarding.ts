import { onboardingKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useOnboarding() {
  return useQuery({
    queryKey: onboardingKeys.status(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.onboarding.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, "Could not read the onboarding status.");

      return response.json();
    },
  });
}

export type OnboardingStatus = NonNullable<ReturnType<typeof useOnboarding>["data"]>;
