import { organizationMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

/**
 * Deletes the organization and everything under it. Owners only. The whole
 * shell describes an organization that is gone, so the page is replaced.
 */
export function useDeleteOrganization() {
  const t = useTranslate();
  return useMutation({
    mutationKey: organizationMutationKeys.delete(),
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.delete({ organizationId });

      if (error) {
        throw new Error(error.message ?? t("errors:couldNotDeleteOrganization"));
      }
    },
    onSuccess: () => {
      window.location.assign("/");
    },
  });
}
