import { organizationKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const { data, error } = await authClient.organization.list({
        fetchOptions: { signal: ctx.signal },
      });

      if (error) {
        throw new Error(error.message ?? "Could not load the organizations.");
      }

      return data;
    },
  });
}
