import { authMutationKeys, sessionKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface ResetPasswordInput {
  email: string;
  code: string;
  password: string;
}

export interface UseResetPasswordOptions {
  redirectTo?: string;
}

/** Sets a new password with the emailed code, then signs in with it. */
export function useResetPassword(options: UseResetPasswordOptions = {}) {
  const queryClient = useQueryClient();
  const redirectTo = options.redirectTo ?? "/";

  return useMutation({
    mutationKey: authMutationKeys.resetPassword(),
    mutationFn: async ({ email, code, password }: ResetPasswordInput) => {
      const reset = await authClient.emailOtp.resetPassword({ email, otp: code, password });

      if (reset.error) {
        throw new Error(reset.error.message ?? "That code did not match.");
      }

      const signIn = await authClient.signIn.email({ email, password, rememberMe: true });

      if (signIn.error) {
        throw new Error(signIn.error.message ?? "The password is set. Sign in with it.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      window.location.assign(redirectTo);
    },
  });
}
