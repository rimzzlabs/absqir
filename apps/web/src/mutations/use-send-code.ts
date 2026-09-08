import { authMutationKeys } from "@absqir/core/query-keys";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export type CodePurpose = "sign-in" | "forget-password";

export interface SendCodeInput {
  email: string;
  purpose: CodePurpose;
}

/** Emails a 6 digit code. Outside production the server prints it to its log. */
export function useSendCode() {
  return useMutation({
    mutationKey: authMutationKeys.sendCode(),
    mutationFn: async ({ email, purpose }: SendCodeInput) => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: purpose });

      if (error) {
        throw new Error(error.message ?? "Could not send the code.");
      }
    },
  });
}
