import { organizationKeys, organizationMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface UpdateOrganizationInput {
  organizationId: string;
  name: string;
  slug: string;
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.update(),
    mutationFn: async ({ organizationId, name, slug }: UpdateOrganizationInput) => {
      const { data, error } = await authClient.organization.update({
        organizationId,
        data: { name, slug },
      });

      if (error || !data) {
        throw new Error(error?.message ?? "Could not save the organization.");
      }

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      // The shell shows the name; a reload is the honest way to refresh it.
      window.location.reload();
    },
  });
}
