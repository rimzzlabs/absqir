import { myKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { api, apiError } from "@/lib/api";

export type MySessionScope = "upcoming" | "past";

export interface MySessionsFilter {
  scope: MySessionScope;
  /** Rows per page. The server's default when absent. */
  limit?: number;
}

/**
 * The sessions that expect me, one page at a time. Upcoming ones soonest
 * first, past ones newest first. A running one moves through its statuses
 * on the clock, so the list refetches on its own.
 */
export function useMySessions(filter: MySessionsFilter = { scope: "upcoming" }) {
  return useInfiniteQuery({
    queryKey: myKeys.sessionsPage(filter.scope, filter.limit ?? null),
    initialPageParam: null as string | null,
    queryFn: async (ctx: QueryFunctionContext<readonly unknown[], string | null>) => {
      const response = await api.my.sessions.$get(
        {
          query: {
            scope: filter.scope,
            limit: filter.limit === undefined ? undefined : String(filter.limit),
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

export function useMyPass(sessionId: string | null) {
  return useQuery({
    queryKey: myKeys.pass(sessionId ?? ""),
    enabled: sessionId !== null,
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.my.sessions[":id"].pass.$get(
        { param: { id: sessionId ?? "" } },
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

export type MySession = NonNullable<
  ReturnType<typeof useMySessions>["data"]
>["pages"][number]["items"][number];
export type HistoryRow = NonNullable<ReturnType<typeof useMyHistory>["data"]>[number];
