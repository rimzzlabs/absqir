import { eventKeys, eventMutationKeys, myKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface CheckInInput {
  eventId: string;
  token: string;
}

/** The member's own check-in, from the link the room screen carries. */
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.checkIn(),
    mutationFn: async ({ eventId, token }: CheckInInput) => {
      const response = await api.events[":id"]["check-in"].$post({
        param: { id: eventId },
        json: { token },
      });

      if (!response.ok) throw await apiError(response, "Could not check you in.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export type CheckInResult = Awaited<ReturnType<ReturnType<typeof useCheckIn>["mutateAsync"]>>;
