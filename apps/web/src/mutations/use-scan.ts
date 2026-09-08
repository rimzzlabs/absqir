import { sessionListKeys, sessionMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface ScanInput {
  sessionId: string;
  code: string;
}

/** The organizer's scanner reading a member's pass. */
export function useScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: sessionMutationKeys.scan(),
    mutationFn: async ({ sessionId, code }: ScanInput) => {
      const response = await api.sessions[":id"].scan.$post({
        param: { id: sessionId },
        json: { code },
      });

      if (!response.ok) throw await apiError(response, "Could not read that pass.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionListKeys.all });
    },
  });
}

export type ScanResult = Awaited<ReturnType<ReturnType<typeof useScan>["mutateAsync"]>>;
