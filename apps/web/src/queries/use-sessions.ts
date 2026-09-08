import { type SessionListFilter, sessionListKeys } from "@absqir/core/query-keys";
import {
  keepPreviousData,
  type QueryFunctionContext,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export type SessionScope = SessionListFilter["scope"];
export type { SessionListFilter };

/** One list, page by page. The filter is the key, so a new search starts at page one. */
export function useSessions(filter: SessionListFilter) {
  return useInfiniteQuery({
    queryKey: sessionListKeys.list(filter),
    initialPageParam: null as string | null,
    queryFn: async (ctx: QueryFunctionContext<readonly unknown[], string | null>) => {
      const [, , wanted] = ctx.queryKey as ReturnType<typeof sessionListKeys.list>;

      const response = await api.sessions.$get(
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

export function useSession(id: string) {
  return useQuery({
    queryKey: sessionListKeys.detail(id),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.sessions[":id"].$get(
        { param: { id } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the event.");

      return response.json();
    },
    refetchInterval: 30_000,
  });
}

export function useSessionRecords(id: string) {
  return useQuery({
    queryKey: sessionListKeys.records(id),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.sessions[":id"].records.$get(
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

export type Session = NonNullable<
  ReturnType<typeof useSessions>["data"]
>["pages"][number]["items"][number];
export type SessionRecord = NonNullable<ReturnType<typeof useSessionRecords>["data"]>[number];
