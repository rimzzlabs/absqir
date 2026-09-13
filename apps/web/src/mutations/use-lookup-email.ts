import { authMutationKeys } from "@absqir/core/query-keys";
import { useMutation } from "@tanstack/react-query";
import { match, P } from "ts-pattern";
import { api, apiError } from "@/lib/api";

/** Step 1 of the single door: what comes next for this email. */
export function useLookupEmail() {
  return useMutation({
    mutationKey: authMutationKeys.lookup(),
    mutationFn: async (input: { email: string; eventId: string | null }) => {
      const response = await api["auth-flow"].lookup.$post({
        json: {
          email: input.email,
          ...match(input.eventId)
            .with(P.string.minLength(1), (eventId) => ({ eventId }))
            .otherwise(() => ({})),
        },
      });

      if (!response.ok) throw await apiError(response, "Could not check that email.");

      return response.json();
    },
  });
}

export type Lookup = Awaited<ReturnType<ReturnType<typeof useLookupEmail>["mutateAsync"]>>;
