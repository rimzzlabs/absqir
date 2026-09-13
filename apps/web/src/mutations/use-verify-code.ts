import { authMutationKeys, sessionKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface VerifyCodeInput {
  email: string;
  code: string;
}

export interface UseVerifyCodeOptions {
  redirectTo?: string;
}

/**
 * Signs in with the emailed code. For an unknown email this also creates the
 * account, which then lands on onboarding.
 */
export function useVerifyCode(options: UseVerifyCodeOptions = {}) {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const redirectTo = options.redirectTo ?? "/";

  return useMutation({
    mutationKey: authMutationKeys.verifyCode(),
    mutationFn: async ({ email, code }: VerifyCodeInput) => {
      const { error } = await authClient.signIn.emailOtp({ email, otp: code });

      if (error) {
        throw new Error(error.message ?? t("errors:codeDidNotMatch"));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      window.location.assign(redirectTo);
    },
  });
}
