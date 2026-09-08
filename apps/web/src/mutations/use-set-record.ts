import { myKeys, sessionListKeys, sessionMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface SetRecordInput {
  sessionId: string;
  personId: string;
  status: "present" | "late" | "excused" | "absent";
  note: string | null;
}

export function useSetRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: sessionMutationKeys.setRecord(),
    mutationFn: async ({ sessionId, personId, ...values }: SetRecordInput) => {
      const response = await api.sessions[":id"].records[":personId"].$put({
        param: { id: sessionId, personId },
        json: values,
      });

      if (!response.ok) throw await apiError(response, "Could not save the record.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionListKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
