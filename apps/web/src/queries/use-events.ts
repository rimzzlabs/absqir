import { type EventListFilter, eventKeys } from "@absqir/core/query-keys";
import {
  keepPreviousData,
  type QueryFunctionContext,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export type EventScope = EventListFilter["scope"];
export type { EventListFilter };

/** One list, page by page. The filter is the key, so a new search starts at page one. */
export function useEvents(filter: EventListFilter) {
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

      if (!response.ok) throw await apiError(response, "Could not load the events.");

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
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.events[":id"].$get(
        { param: { id } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the event.");

      return response.json();
    },
    refetchInterval: 30_000,
  });
}

export function useEventRecords(id: string) {
  return useQuery({
    queryKey: eventKeys.records(id),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.events[":id"].records.$get(
        { param: { id } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the records.");

      return response.json();
    },
    // Check-ins land while the organizer watches the list.
    refetchInterval: 5_000,
  });
}

export type Event = NonNullable<
  ReturnType<typeof useEvents>["data"]
>["pages"][number]["items"][number];
export type EventRecord = NonNullable<ReturnType<typeof useEventRecords>["data"]>[number];
