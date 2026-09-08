import { scheduleKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useSchedules() {
  return useQuery({
    queryKey: scheduleKeys.list(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.schedules.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, "Could not load the schedules.");

      return response.json();
    },
  });
}

export type Schedule = NonNullable<ReturnType<typeof useSchedules>["data"]>[number];
