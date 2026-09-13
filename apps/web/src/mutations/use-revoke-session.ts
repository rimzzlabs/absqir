import { accountKeys, accountMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { match, P } from "ts-pattern";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error";

/** Signs out one other device. Null signs out every device but this one. */
export function useRevokeSession() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: accountMutationKeys.revokeSession(),
    mutationFn: async (token: string | null) => {
      const { error } = await match(token)
        .with(P.string.minLength(1), async (token) => await authClient.revokeSession({ token }))
        .otherwise(async () => await authClient.revokeOtherSessions());

      if (error) throw authErrorMessage(t, error, t("errors:couldNotSignDeviceOut"));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.devices() });
    },
  });
}
