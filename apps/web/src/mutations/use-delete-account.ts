import { accountMutationKeys } from "@absqir/core/query-keys";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface DeleteAccountInput {
  /**
   * Undefined for an account that signs in with a code or a provider. Better
   * Auth then wants a session younger than an hour instead.
   */
  password?: string | undefined;
}

/**
 * Deletes the account. The session dies with it, so the browser lands on the
 * sign-in page.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationKey: accountMutationKeys.deleteAccount(),
    mutationFn: async (values: DeleteAccountInput) => {
      // An empty string would be dropped and Better Auth would fall back to
      // the freshness check, which deletes the account without the password
      // the reader was asked for.
      if (values.password !== undefined && values.password.length === 0) {
        throw new Error("Give your password to delete the account.");
      }

      const { error } = await authClient.deleteUser(
        values.password === undefined ? {} : { password: values.password },
      );

      if (error?.code === "SESSION_EXPIRED") {
        throw new Error("You signed in a while ago. Sign out, sign in again, then delete it.");
      }

      if (error?.code === "INVALID_PASSWORD") {
        throw new Error("That password is wrong.");
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
