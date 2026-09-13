import { accountKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** How this account can sign in: a password, and the providers it linked. */
export function useCredentials() {
  const t = useTranslate();
  return useQuery({
    queryKey: accountKeys.credentials(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.me.credentials.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotReadSignInMethods"));

      return response.json();
    },
  });
}

export type Credentials = NonNullable<ReturnType<typeof useCredentials>["data"]>;
