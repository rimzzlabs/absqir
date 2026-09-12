import { organizationMutationKeys } from "@absqir/core/query-keys";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

/**
 * Deletes the organization and everything under it. Owners only. The whole
 * shell describes an organization that is gone, so the page is replaced.
 */
export function useDeleteOrganization() {
  return useMutation({
    mutationKey: organizationMutationKeys.delete(),
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.delete({ organizationId });

      if (error) {
        throw new Error(error.message ?? "Could not delete the organization.");
      }
    },
    onSuccess: () => {
      window.location.assign("/");
    },
  });
}
