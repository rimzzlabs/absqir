import { type EventListFilter, type EventRecordsFilter, eventKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import {
  keepPreviousData,
  type QueryFunctionContext,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { match } from "ts-pattern";
import { api, apiError } from "@/lib/api";

export type EventScope = EventListFilter["scope"];
export type { EventListFilter };

/** One list, page by page. The filter is the key, so a new search starts at page one. */
export function useEvents(filter: EventListFilter) {
  const t = useTranslate();
  return useInfiniteQuery({
    queryKey: eventKeys.list(filter),
    initialPageParam: null as string | null,
    queryFn: async (ctx: QueryFunctionContext<readonly unknown[], string | null>) => {
      const [, , wanted] = ctx.queryKey as ReturnType<typeof eventKeys.list>;

      const response = await api.events.$get(
        {
          query: {
            scope: wanted.scope,
            q: wanted.q || undefined,
            groupId: wanted.groupId || undefined,
            cursor: ctx.pageParam ?? undefined,
          },
        },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadEvents"));

      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // While the reader types, the old page stays instead of a skeleton.
    placeholderData: keepPreviousData,
    // A running event moves through its statuses on the clock.
    refetchInterval: 60_000,
  });
}

export function useEvent(id: string) {
  const t = useTranslate();
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.events[":id"].$get(
        { param: { id } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadEvent"));

      return response.json();
    },
    refetchInterval: 30_000,
  });
}

const EVERY_RECORD: EventRecordsFilter = { q: "", status: "" };

/** What the first screen of the records list asks for. */
export const RECORDS_PAGE_SIZE = 20;

/**
 * One event's records, page by page, by name. The filter is the key, so a
 * new search starts at page one. Every page carries the flag count for the
 * whole event, which no page of rows could tell on its own.
 */
export function useEventRecords(id: string, filter: EventRecordsFilter = EVERY_RECORD) {
  const t = useTranslate();
  return useInfiniteQuery({
    queryKey: eventKeys.recordsPage(id, filter),
    initialPageParam: null as string | null,
    queryFn: async (ctx: QueryFunctionContext<readonly unknown[], string | null>) => {
      const response = await api.events[":id"].records.$get(
        {
          param: { id },
          query: {
            q: filter.q || undefined,
            status: match(filter.status)
              .with("present", "late", "excused", "absent", "none", (status) => status)
              .otherwise(() => undefined),
            limit: String(RECORDS_PAGE_SIZE),
            cursor: ctx.pageParam ?? undefined,
          },
        },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadRecords"));

      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // While the organizer types, the old page stays instead of a skeleton.
    placeholderData: keepPreviousData,
    // Check-ins land while the organizer watches the list.
    refetchInterval: 5_000,
  });
}

export type Event = NonNullable<
  ReturnType<typeof useEvents>["data"]
>["pages"][number]["items"][number];
export type EventRecordsPage = NonNullable<
  ReturnType<typeof useEventRecords>["data"]
>["pages"][number];
export type EventRecord = EventRecordsPage["items"][number];
export type { EventRecordsFilter };
