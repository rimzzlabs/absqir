import { domainKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** The email domains the active organization claims, and its join policy. */
export function useDomains() {
  const t = useTranslate();
  return useQuery({
    queryKey: domainKeys.list(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.organizations.domains.$get(undefined, {
        init: { signal: ctx.signal },
      });

      if (!response.ok) throw await apiError(response, t("errors:couldNotReadDomains"));

      return response.json();
    },
  });
}

export type OrganizationDomain = NonNullable<
  ReturnType<typeof useDomains>["data"]
>["items"][number];
