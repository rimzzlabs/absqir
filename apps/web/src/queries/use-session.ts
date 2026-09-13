import { sessionKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

/** Just under the five minute cookie cache, so a tab never holds a stale user. */
const REFETCH_MS = 4 * 60 * 1000;

/**
 * Reading the session also renews it when it is past its updateAge, so an open
 * tab keeps the rolling session alive on its own.
 */
export function useSession() {
  const t = useTranslate();
  return useQuery({
    queryKey: sessionKeys.current(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const { data, error } = await authClient.getSession({
        fetchOptions: { signal: ctx.signal },
      });

      if (error) {
        throw new Error(error.message ?? t("errors:couldNotReadSession"));
      }

      return data;
    },
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
