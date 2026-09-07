import { authMutationKeys, sessionKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import type { SignUpValues } from "@/lib/auth-schemas";

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: authMutationKeys.signUp(),
    mutationFn: async (values: SignUpValues) => {
      const { data, error } = await authClient.signUp.email(values);

      if (error) {
        throw new Error(error.message ?? "Could not create the account.");
      }

      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: sessionKeys.all });

      // With a Resend key set, sign-up sends a verification email and starts no
      // session. Without one, the reader is signed in already.
      if (data?.user.emailVerified !== false) {
        window.location.assign("/");
      }
    },
  });
}
