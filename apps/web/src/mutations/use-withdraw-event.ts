import { myKeys, publicEventKeys, publicEventMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Takes the signed-in reader off an open event's list. */
export function useWithdrawEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: publicEventMutationKeys.withdraw(),
    mutationFn: async (id: string) => {
      const response = await api.public.events[":id"].register.$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not withdraw your registration.");

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(publicEventKeys.detail(data.id), data);
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
