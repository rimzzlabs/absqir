import { joinRequestMutationKeys, meKeys, onboardingKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface AskToJoinInput {
  message?: string;
}

/**
 * Asks the workspace that claimed this account's email domain to let it in.
 * A workspace set to `auto` takes the account at once, so the page reloads
 * into it. A workspace set to `request` answers with an open request.
 */
export function useAskToJoin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: joinRequestMutationKeys.ask(),
    mutationFn: async (input: AskToJoinInput) => {
      const response = await api["join-requests"].$post({ json: { message: input.message } });

      if (!response.ok) throw await apiError(response, "Could not send the request.");

      return response.json();
    },
    onSuccess: (result) => {
      queryClient.removeQueries({ queryKey: onboardingKeys.all });
      queryClient.removeQueries({ queryKey: meKeys.all });

      if (result.status === "joined") window.location.assign("/");
    },
  });
}
