import { organizationMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

/**
 * Gives up membership. The account keeps its profile and lands in the
 * waiting room, so the page is replaced rather than refreshed.
 */
export function useLeaveOrganization() {
  const t = useTranslate();
  return useMutation({
    mutationKey: organizationMutationKeys.leave(),
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.leave({ organizationId });

      if (error) {
        throw new Error(error.message ?? t("errors:couldNotLeaveOrganization"));
      }
    },
    onSuccess: () => {
      window.location.assign("/");
    },
  });
}
