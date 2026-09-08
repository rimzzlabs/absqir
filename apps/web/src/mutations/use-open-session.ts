import { myKeys, sessionListKeys, sessionMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useOpenSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: sessionMutationKeys.open(),
    mutationFn: async (id: string) => {
      const response = await api.sessions[":id"].open.$post({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not open the session.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionListKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
