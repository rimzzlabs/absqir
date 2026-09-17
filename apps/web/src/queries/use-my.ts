import { type HistoryFilter, myKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import {
  keepPreviousData,
  type QueryFunctionContext,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
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
  const t = useTranslate();
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

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadYourEvents"));

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
  const t = useTranslate();
  return useQuery({
    queryKey: myKeys.event(eventId),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.my.events[":id"].$get(
        { param: { id: eventId } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadThisEvent"));

      return response.json();
    },
    refetchInterval: 30_000,
  });
}

export function useMyPass(eventId: string | null) {
  const t = useTranslate();
  return useQuery({
    queryKey: myKeys.pass(eventId ?? ""),
    enabled: eventId !== null,
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.my.events[":id"].pass.$get(
        { param: { id: eventId ?? "" } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadYourPass"));

      const data = await response.json();

      return { ...data, qrDataUrl: await QRCode.toDataURL(data.code, { width: 512, margin: 1 }) };
    },
  });
}

const EVERY_FILTER: HistoryFilter = { q: "", status: "", when: "any" };

/**
 * My record, page by page. The filter is the key, so a new search starts at
 * page one. Every page carries the same summary, counted over the window
 * rather than over what is loaded.
 */
export function useMyHistory(filter: HistoryFilter = EVERY_FILTER) {
  const t = useTranslate();
  return useInfiniteQuery({
    queryKey: myKeys.historyPage(filter),
    initialPageParam: null as string | null,
    queryFn: async (ctx: QueryFunctionContext<readonly unknown[], string | null>) => {
      const response = await api.my.history.$get(
        {
          query: {
            q: filter.q || undefined,
            status: match(filter.status)
              .with("present", "late", "excused", "absent", (status) => status)
              .otherwise(() => undefined),
            when: filter.when,
            limit: match(filter.limit)
              .with(undefined, () => undefined)
              .otherwise((limit) => String(limit)),
            cursor: ctx.pageParam ?? undefined,
          },
        },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadYourHistory"));

      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // While the reader types, the old page stays instead of a skeleton.
    placeholderData: keepPreviousData,
  });
}

export type MyEvent = NonNullable<
  ReturnType<typeof useMyEvents>["data"]
>["pages"][number]["items"][number];
export type MyEventDetail = NonNullable<ReturnType<typeof useMyEvent>["data"]>;
export type { HistoryFilter };
export type HistoryPage = NonNullable<ReturnType<typeof useMyHistory>["data"]>["pages"][number];
export type HistoryRow = HistoryPage["items"][number];
export type HistorySummary = HistoryPage["summary"];

/** The counts before any page arrives: nothing recorded yet. */
export const EMPTY_HISTORY_SUMMARY: HistorySummary = {
  total: 0,
  present: 0,
  late: 0,
  excused: 0,
  absent: 0,
};
