import { orgPath } from "@absqir/core/org-path";
import { organizationKeys, organizationMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { organizationErrorMessage } from "@/lib/organization-error";

export interface UpdateOrganizationInput {
  organizationId: string;
  name?: string;
  slug?: string;
  /** Undefined leaves the logo alone; null removes it. */
  logo?: string | null;
}

export function useUpdateOrganization() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.update(),
    mutationFn: async (values: UpdateOrganizationInput) => {
      const { organizationId, ...fields } = values;
      const { data, error } = await authClient.organization.update({
        organizationId,
        data: fields,
      });

      if (error || !data) {
        throw new Error(
          organizationErrorMessage({ t, error, fallback: t("errors:couldNotSaveOrganization") }),
        );
      }

      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      // The shell shows the name and the logo, so the page is read again. A
      // new slug is a new address, so the browser goes to where the
      // organization now lives rather than where it used to.
      window.location.assign(orgPath(data.slug, "/organization"));
    },
  });
}
