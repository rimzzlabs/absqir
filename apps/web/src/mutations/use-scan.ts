import { eventKeys, eventMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface ScanInput {
  eventId: string;
  code: string;
}

/** The organizer's scanner reading a member's pass. */
export function useScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.scan(),
    mutationFn: async ({ eventId, code }: ScanInput) => {
      const response = await api.events[":id"].scan.$post({
        param: { id: eventId },
        json: { code },
      });

      if (!response.ok) throw await apiError(response, "Could not read that pass.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export type ScanResult = Awaited<ReturnType<ReturnType<typeof useScan>["mutateAsync"]>>;
