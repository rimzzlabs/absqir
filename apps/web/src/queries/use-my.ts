import { myKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { match } from "ts-pattern";
import { api, apiError } from "@/lib/api";

export type MyEventScope = "upcoming" | "past";

export interface MyEventsFilter {
  scope: MyEventScope;
  /** Rows per page. The server's default when absent. */
  limit?: number;
}

/**
 * The events that expect me, one page at a time. Upcoming ones soonest
 * first, past ones newest first. A running one moves through its statuses
 * on the clock, so the list refetches on its own.
 */
export function useMyEvents(filter: MyEventsFilter = { scope: "upcoming" }) {
  return useInfiniteQuery({
    queryKey: myKeys.eventsPage(filter.scope, filter.limit ?? null),
    initialPageParam: null as string | null,
    queryFn: async (ctx: QueryFunctionContext<readonly unknown[], string | null>) => {
      const response = await api.my.events.$get(
        {
          query: {
            scope: filter.scope,
            limit: match(filter.limit)
              .with(undefined, () => undefined)
              .otherwise((limit) => String(limit)),
            cursor: ctx.pageParam ?? undefined,
          },
        },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load your events.");

      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: 30_000,
  });
}

/**
 * One event that expects me, with the names of everyone else expected. The
 * answer is 404 when the event does not expect me, so a member cannot read a
 * roster by guessing an id.
 */
export function useMyEvent(eventId: string) {
  return useQuery({
    queryKey: myKeys.event(eventId),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.my.events[":id"].$get(
        { param: { id: eventId } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load this event.");

      return response.json();
    },
    refetchInterval: 30_000,
  });
}

export function useMyPass(eventId: string | null) {
  return useQuery({
    queryKey: myKeys.pass(eventId ?? ""),
    enabled: eventId !== null,
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.my.events[":id"].pass.$get(
        { param: { id: eventId ?? "" } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load your pass.");

      const data = await response.json();

      return { ...data, qrDataUrl: await QRCode.toDataURL(data.code, { width: 512, margin: 1 }) };
    },
  });
}

export function useMyHistory() {
  return useQuery({
    queryKey: myKeys.history(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.my.history.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, "Could not load your history.");

      return response.json();
    },
  });
}

export type MyEvent = NonNullable<
  ReturnType<typeof useMyEvents>["data"]
>["pages"][number]["items"][number];
export type MyEventDetail = NonNullable<ReturnType<typeof useMyEvent>["data"]>;
export type HistoryRow = NonNullable<ReturnType<typeof useMyHistory>["data"]>[number];
