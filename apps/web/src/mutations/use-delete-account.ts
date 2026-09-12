import { accountMutationKeys } from "@absqir/core/query-keys";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface DeleteAccountInput {
  /**
   * Undefined for an account that signs in with a code or a provider. Better
   * Auth then wants a session younger than an hour instead.
   */
  password?: string;
}

/**
 * Deletes the account. The session dies with it, so the browser lands on the
 * sign-in page.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationKey: accountMutationKeys.deleteAccount(),
    mutationFn: async (values: DeleteAccountInput) => {
      const { error } = await authClient.deleteUser(
        values.password ? { password: values.password } : {},
      );

      if (error?.code === "SESSION_EXPIRED") {
        throw new Error("You signed in a while ago. Sign out, sign in again, then delete it.");
      }

      if (error) {
        throw new Error(error.message ?? "Could not delete the account.");
      }
    },
    onSuccess: () => {
      window.location.assign("/sign-in");
    },
  });
}
