import { authMutationKeys, sessionKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import type { SignInValues } from "@/lib/auth-schemas";

export interface UseSignInOptions {
  /** Where to send the reader after a successful sign in. */
  redirectTo?: string;
}

export function useSignIn(options: UseSignInOptions = {}) {
  const queryClient = useQueryClient();
  const redirectTo = options.redirectTo ?? "/";

  return useMutation({
    mutationKey: authMutationKeys.signIn(),
    mutationFn: async (values: SignInValues) => {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        // Off means the cookie dies with the browser session.
        rememberMe: values.rememberMe,
      });

      if (error) {
        throw new Error(error.message ?? "Those details did not match an account.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      window.location.assign(redirectTo);
    },
  });
}
