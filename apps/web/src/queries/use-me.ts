import { meKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** The signed-in user with their onboarding step and every membership. */
export function useMe() {
  return useQuery({
    queryKey: meKeys.current(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.me.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, "Could not read the account.");

      return response.json();
    },
  });
}

export type Me = NonNullable<ReturnType<typeof useMe>["data"]>;
export type Membership = Me["memberships"][number];
