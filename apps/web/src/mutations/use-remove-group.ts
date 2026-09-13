import {
  groupKeys,
  groupMutationKeys,
  organizationKeys,
  peopleKeys,
} from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useRemoveGroup() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: groupMutationKeys.remove(),
    mutationFn: async (id: string) => {
      const response = await api.groups[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotDeleteGroup"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.all });
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
