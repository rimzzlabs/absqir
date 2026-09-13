import { accountMutationKeys } from "@absqir/core/query-keys";
import type { Locale } from "@absqir/i18n";
import { useMutation } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/**
 * The language I read absqir in. Every island takes its language from the
 * page, so a saved choice reloads rather than re-rendering piece by piece.
 */
export function useUpdateLocale() {
  return useMutation({
    mutationKey: accountMutationKeys.locale(),
    mutationFn: async (locale: Locale) => {
      const response = await api.me.locale.$patch({ json: { locale } });

      if (!response.ok) throw await apiError(response, "Could not save the language.");

      return response.json();
    },
    onSuccess: () => {
      window.location.reload();
    },
  });
}
