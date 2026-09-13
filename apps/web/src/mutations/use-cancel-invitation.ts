import { organizationKeys, organizationMutationKeys, peopleKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useCancelInvitation() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.cancelInvitation(),
    mutationFn: async (invitationId: string) => {
      const { error } = await authClient.organization.cancelInvitation({ invitationId });

      if (error) {
        throw new Error(error.message ?? t("errors:couldNotCancelInvitation"));
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}
