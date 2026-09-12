import { myKeys, publicEventKeys, publicEventMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Puts the signed-in reader on an open event's list. */
export function useRegisterEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: publicEventMutationKeys.register(),
    mutationFn: async (id: string) => {
      const response = await api.public.events[":id"].register.$post({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not register you.");

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(publicEventKeys.detail(data.id), data);
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
    },
  });
}
