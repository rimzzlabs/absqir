import { eventKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** The public face of an open session. Works signed out. */
export function useEvent(id: string | null) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? ""),
    enabled: id !== null,
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.events[":id"].$get(
        { param: { id: id ?? "" } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "This session is not open to the public.");

      return response.json();
    },
    refetchInterval: 30_000,
  });
}

export type PublicEvent = NonNullable<ReturnType<typeof useEvent>["data"]>;
