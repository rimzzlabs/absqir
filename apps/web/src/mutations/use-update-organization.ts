import { organizationKeys, organizationMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface UpdateOrganizationInput {
  organizationId: string;
  name?: string;
  slug?: string;
  /** Undefined leaves the logo alone; null removes it. */
  logo?: string | null;
}

export function useUpdateOrganization() {
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
        throw new Error(error?.message ?? "Could not save the organization.");
      }

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      // The shell shows the name and the logo; a reload is the honest way to
      // refresh them.
      window.location.reload();
    },
  });
}
