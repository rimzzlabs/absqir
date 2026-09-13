import { accountKeys, accountMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error";

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  /** Every other device has to sign in again. */
  signOutOthers: boolean;
}

export function useChangePassword() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: accountMutationKeys.changePassword(),
    mutationFn: async (values: ChangePasswordInput) => {
      const { error } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: values.signOutOthers,
      });

      if (error) throw authErrorMessage(t, error, t("errors:couldNotChangePassword"));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.devices() });
    },
  });
}
