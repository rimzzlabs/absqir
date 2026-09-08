import { meKeys, organizationKeys, organizationMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

/** For an account that finished onboarding and creates another organization. */
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.create(),
    mutationFn: async ({ name, slug }: CreateOrganizationInput) => {
      const { data, error } = await authClient.organization.create({ name, slug });

      if (error || !data) {
        throw new Error(error?.message ?? "Could not create the organization.");
      }

      const setActive = await authClient.organization.setActive({ organizationId: data.id });

      if (setActive.error) {
        throw new Error(setActive.error.message ?? "Could not switch to the new organization.");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: organizationKeys.all });
      queryClient.removeQueries({ queryKey: meKeys.all });
      window.location.assign("/");
    },
  });
}
