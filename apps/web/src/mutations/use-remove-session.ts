import {
  myKeys,
  organizationKeys,
  sessionListKeys,
  sessionMutationKeys,
} from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useRemoveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: sessionMutationKeys.remove(),
    mutationFn: async (id: string) => {
      const response = await api.sessions[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not delete the session.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionListKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
