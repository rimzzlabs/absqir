import { orgPath } from "@absqir/core/org-path";
import { meKeys, organizationKeys, organizationMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { organizationErrorMessage } from "@/lib/organization-error";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

/** For an account that finished onboarding and creates another organization. */
export function useCreateOrganization() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.create(),
    mutationFn: async ({ name, slug }: CreateOrganizationInput) => {
      const { data, error } = await authClient.organization.create({ name, slug });

      if (error || !data) {
        throw new Error(
          organizationErrorMessage({
            t,
            error,
            fallback: t("errors:couldNotCreateOrganization"),
          }),
        );
      }

      const setActive = await authClient.organization.setActive({ organizationId: data.id });

      if (setActive.error) {
        throw new Error(setActive.error.message ?? t("errors:couldNotSwitchToNewOrganization"));
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: organizationKeys.all });
      queryClient.removeQueries({ queryKey: meKeys.all });
      // The new organization has an address of its own, so the browser opens
      // it rather than the root, which would only redirect here anyway.
      window.location.assign(orgPath(data.slug, "/"));
    },
  });
}
