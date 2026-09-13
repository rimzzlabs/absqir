import { organizationMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useSetActiveOrganization() {
  const t = useTranslate();
  return useMutation({
    mutationKey: organizationMutationKeys.setActive(),
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.setActive({ organizationId });

      if (error) {
        throw new Error(error.message ?? t("errors:couldNotSwitchOrganizations"));
      }
    },
    onSuccess: () => {
      // The shell is rendered on the server with the active organization, so
      // every query and every page has to start over.
      window.location.assign("/");
    },
  });
}
