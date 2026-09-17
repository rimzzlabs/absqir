import { type HistoryFilter, type MyEventsFilter, myKeys } from "@absqir/core/query-keys";
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

export type MyEventScope = MyEventsFilter["scope"];
export type { MyEventsFilter };

const EVERY_EVENT: MyEventsFilter = { scope: "upcoming", q: "" };

/**
 * The events that expect me, one page at a time. Upcoming ones soonest
 * first, past ones newest first. A running one moves through its statuses
 * on the clock, so the list refetches on its own.
 */
export function useMyEvents(filter: MyEventsFilter = EVERY_EVENT) {
  const t = useTranslate();
  return useInfiniteQuery({
    queryKey: myKeys.eventsPage(filter),
    initialPageParam: null as string | null,
    queryFn: async (ctx: QueryFunctionContext<readonly unknown[], string | null>) => {
      const response = await api.my.events.$get(
        {
          query: {
            scope: filter.scope,
            q: filter.q || undefined,
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
    // While the reader types, the old page stays instead of a skeleton.
    placeholderData: keepPreviousData,
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

/** What the first screen of the roster asks for. */
export const ROSTER_PAGE_SIZE = 20;

/**
 * The names expected at one event that expects me, page by page. Names
 * alone: the API sends no status, so no reader can tell from this list who
 * missed what.
 */
export function useMyRoster(eventId: string, q = "") {
  const t = useTranslate();
  return useInfiniteQuery({
    queryKey: myKeys.roster(eventId, q),
    initialPageParam: null as string | null,
    queryFn: async (ctx: QueryFunctionContext<readonly unknown[], string | null>) => {
      const response = await api.my.events[":id"].roster.$get(
        {
          param: { id: eventId },
          query: {
            q: q || undefined,
            limit: String(ROSTER_PAGE_SIZE),
            cursor: ctx.pageParam ?? undefined,
          },
        },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadThisEvent"));

      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // While the reader types, the old page stays instead of a skeleton.
    placeholderData: keepPreviousData,
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

export type RosterPerson = NonNullable<
  ReturnType<typeof useMyRoster>["data"]
>["pages"][number]["items"][number];
