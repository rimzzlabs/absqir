import { eventKeys, eventMutationKeys, myKeys, organizationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface EventInput {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  lateAfterMinutes: number;
  opensBeforeMinutes: number;
  allowWalkIns: boolean;
  registrationOpen: boolean;
  registrationLimit: number | null;
  /** A saved place. Null clears the fence. */
  locationId: string | null;
  requireLocation: boolean;
  groupIds: string[];
}

export function useCreateEvent() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.create(),
    mutationFn: async (values: EventInput) => {
      const response = await api.events.$post({ json: values });

      if (!response.ok) throw await apiError(response, t("errors:couldNotCreateEvent"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
