import { authMutationKeys, sessionKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface UseSignOutOptions {
  redirectTo?: string;
}

export function useSignOut(options: UseSignOutOptions = {}) {
  const queryClient = useQueryClient();
  const redirectTo = options.redirectTo ?? "/sign-in";

  return useMutation({
    mutationKey: authMutationKeys.signOut(),
    mutationFn: async () => {
      const { error } = await authClient.signOut();

      if (error) {
        throw new Error(error.message ?? "Could not sign out.");
      }
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: sessionKeys.all });
      window.location.assign(redirectTo);
    },
  });
}
