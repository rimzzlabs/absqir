import { organizationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** The active organization, the caller's role in it, and a few counts. */
export function useOrganization() {
  const t = useTranslate();
  return useQuery({
    queryKey: organizationKeys.current(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.organizations.current.$get(undefined, {
        init: { signal: ctx.signal },
      });

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadOrganization"));

      return response.json();
    },
  });
}

export type Organization = NonNullable<ReturnType<typeof useOrganization>["data"]>;
