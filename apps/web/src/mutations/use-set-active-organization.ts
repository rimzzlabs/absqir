import { organizationMutationKeys } from "@absqir/core/query-keys";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useSetActiveOrganization() {
  return useMutation({
    mutationKey: organizationMutationKeys.setActive(),
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.setActive({ organizationId });

      if (error) {
        throw new Error(error.message ?? "Could not switch organizations.");
      }
    },
    onSuccess: () => {
      // The shell is rendered on the server with the active organization, so
      // every query and every page has to start over.
      window.location.assign("/");
    },
  });
}
