import { leaveKeys, leaveMutationKeys, myKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Withdraws a pending request. */
export function useWithdrawLeave() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: leaveMutationKeys.withdraw(),
    mutationFn: async (id: string) => {
      const response = await api.my.leave[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotWithdrawRequest"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.events() });
    },
  });
}
