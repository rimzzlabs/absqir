import { authMutationKeys, meKeys, onboardingKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Step 3 through a public event page: join, register, finish. */
export function useOnboardingEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...authMutationKeys.onboarding(), "event"],
    mutationFn: async (eventId: string) => {
      const response = await api.onboarding.event.$post({ json: { eventId } });

      if (!response.ok) throw await apiError(response, "Could not register you.");

      return { ...(await response.json()), eventId };
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: onboardingKeys.all });
      queryClient.removeQueries({ queryKey: meKeys.all });
      window.location.assign(`/e/${data.eventId}`);
    },
  });
}
