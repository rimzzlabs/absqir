import { attendanceKeys, organizationMutationKeys, sessionKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useSetActiveOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.setActive(),
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.setActive({ organizationId });

      if (error) {
        throw new Error(error.message ?? "Could not switch organizations.");
      }
    },
    onSuccess: () => {
      // The active organization lives on the auth session, and every
      // attendance query is scoped by it on the server.
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}
