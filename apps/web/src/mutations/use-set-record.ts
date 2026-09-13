import { eventKeys, eventMutationKeys, myKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface SetRecordInput {
  eventId: string;
  personId: string;
  status: "present" | "late" | "excused" | "absent";
  note: string | null;
}

export function useSetRecord() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.setRecord(),
    mutationFn: async ({ eventId, personId, ...values }: SetRecordInput) => {
      const response = await api.events[":id"].records[":personId"].$put({
        param: { id: eventId, personId },
        json: values,
      });

      if (!response.ok) throw await apiError(response, t("errors:couldNotSaveRecord"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
