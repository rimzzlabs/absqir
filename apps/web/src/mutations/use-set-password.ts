import { accountKeys, accountMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** For an account that has no password yet. Changing one goes elsewhere. */
export function useSetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: accountMutationKeys.setPassword(),
    mutationFn: async (password: string) => {
      const response = await api.me.password.$post({ json: { password } });

      if (!response.ok) throw await apiError(response, "Could not set the password.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.credentials() });
    },
  });
}
