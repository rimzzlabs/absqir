import { myKeys, sessionListKeys, sessionMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface CheckInInput {
  sessionId: string;
  token: string;
}

/** The member's own check-in, from the link the room screen carries. */
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: sessionMutationKeys.checkIn(),
    mutationFn: async ({ sessionId, token }: CheckInInput) => {
      const response = await api.sessions[":id"]["check-in"].$post({
        param: { id: sessionId },
        json: { token },
      });

      if (!response.ok) throw await apiError(response, "Could not check you in.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionListKeys.all });
    },
  });
}

export type CheckInResult = Awaited<ReturnType<ReturnType<typeof useCheckIn>["mutateAsync"]>>;
