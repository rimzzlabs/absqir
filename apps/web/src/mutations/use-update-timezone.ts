import { accountMutationKeys } from "@absqir/core/query-keys";
import { useMutation } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/**
 * The zone I read times in, or null to follow the device. The page carries
 * the zone in its markup, so a saved choice reloads it.
 */
export function useUpdateTimezone() {
  return useMutation({
    mutationKey: accountMutationKeys.timezone(),
    mutationFn: async (timezone: string | null) => {
      const response = await api.me.timezone.$patch({ json: { timezone } });

      if (!response.ok) throw await apiError(response, "Could not save the time zone.");

      return response.json();
    },
    onSuccess: () => {
      window.location.reload();
    },
  });
}
