import { myKeys, sessionListKeys, sessionMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";
import type { SessionInput } from "@/mutations/use-create-session";

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: sessionMutationKeys.update(),
    mutationFn: async ({ id, ...values }: SessionInput & { id: string }) => {
      const response = await api.sessions[":id"].$patch({ param: { id }, json: values });

      if (!response.ok) throw await apiError(response, "Could not save the event.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionListKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
