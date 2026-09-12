import { eventKeys, eventMutationKeys, myKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface SetRecordInput {
  eventId: string;
  personId: string;
  status: "present" | "late" | "excused" | "absent";
  note: string | null;
}

export function useSetRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.setRecord(),
    mutationFn: async ({ eventId, personId, ...values }: SetRecordInput) => {
      const response = await api.events[":id"].records[":personId"].$put({
        param: { id: eventId, personId },
        json: values,
      });

      if (!response.ok) throw await apiError(response, "Could not save the record.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
