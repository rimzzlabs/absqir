import { calendarKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Everything that touches the visible range, sessions and projections. */
export function useCalendar(from: Date, to: Date) {
  const query = { from: from.toISOString(), to: to.toISOString() };

  return useQuery({
    queryKey: calendarKeys.range(query.from, query.to),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.calendar.$get({ query }, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, "Could not load the calendar.");

      return response.json();
    },
    // A session moves through its statuses on the clock.
    refetchInterval: 60_000,
  });
}

type Calendar = NonNullable<ReturnType<typeof useCalendar>["data"]>;

export type CalendarSession = Calendar["sessions"][number];
export type ProjectedSession = Calendar["projected"][number];
