import { domainKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** The email domains the active organization claims, and its join policy. */
export function useDomains() {
  return useQuery({
    queryKey: domainKeys.list(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.organizations.domains.$get(undefined, {
        init: { signal: ctx.signal },
      });

      if (!response.ok) throw await apiError(response, "Could not read the domains.");

      return response.json();
    },
  });
}

export type OrganizationDomain = NonNullable<
  ReturnType<typeof useDomains>["data"]
>["items"][number];
