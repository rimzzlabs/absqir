import { groupKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.groups.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, "Could not load the groups.");

      return response.json();
    },
  });
}

export function useGroup(id: string | null) {
  return useQuery({
    queryKey: groupKeys.detail(id ?? ""),
    enabled: id !== null,
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.groups[":id"].$get(
        { param: { id: id ?? "" } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the group.");

      return response.json();
    },
  });
}

export type Group = NonNullable<ReturnType<typeof useGroups>["data"]>[number];
export type GroupDetail = NonNullable<ReturnType<typeof useGroup>["data"]>;
