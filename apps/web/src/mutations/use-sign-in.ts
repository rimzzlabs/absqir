import { authMutationKeys, sessionKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface SignInInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface UseSignInOptions {
  /** Where to send the reader after a successful sign in. */
  redirectTo?: string;
}

export function useSignIn(options: UseSignInOptions = {}) {
  const queryClient = useQueryClient();
  const redirectTo = options.redirectTo ?? "/";

  return useMutation({
    mutationKey: authMutationKeys.signIn(),
    mutationFn: async (values: SignInInput) => {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        // Off means the cookie dies with the browser session.
        rememberMe: values.rememberMe,
      });

      if (error) {
        throw new Error(error.message ?? "That password did not match.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      window.location.assign(redirectTo);
    },
  });
}
