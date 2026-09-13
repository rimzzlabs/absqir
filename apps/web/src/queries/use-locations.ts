import { locationKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** The places the organization checks people in at. */
export function useLocations() {
  return useQuery({
    queryKey: locationKeys.list(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.locations.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, "Could not load the places.");

      return response.json();
    },
  });
}

export type Place = NonNullable<ReturnType<typeof useLocations>["data"]>[number];
