import { healthKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * queryFn is a throw boundary: TanStack Query turns the throw into error state
 * for the UI, so this is one of the few places the frontend throws.
 */
export function useHealth() {
  const t = useTranslate();
  return useQuery({
    queryKey: healthKeys.status(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.health.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) {
        throw new Error(t("errors:apiDidNotAnswer"));
      }

      return response.json();
    },
  });
}
