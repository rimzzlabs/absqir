import { authMutationKeys, meKeys, onboardingKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Step 3 through a public event page: join, register, finish. */
export function useOnboardingEvent() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...authMutationKeys.onboarding(), "event"],
    mutationFn: async (eventId: string) => {
      const response = await api.onboarding.event.$post({ json: { eventId } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotRegisterYou"));

      return { ...(await response.json()), eventId };
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: onboardingKeys.all });
      queryClient.removeQueries({ queryKey: meKeys.all });
      window.location.assign(`/e/${data.eventId}`);
    },
  });
}
