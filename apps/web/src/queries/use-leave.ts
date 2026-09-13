import { leaveKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { api, apiError } from "@/lib/api";

export type LeaveScope = "pending" | "decided" | "all";

/** The organizer's queue. */
export function useLeaveQueue(scope: LeaveScope = "pending") {
  return useQuery({
    queryKey: leaveKeys.queue(scope),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.leave.$get(
        { query: { status: scope } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the leave requests.");

      return response.json();
    },
    refetchInterval: 30_000,
  });
}

export interface MyLeaveFilter {
  scope: LeaveScope;
  /** Rows per page. The server's default when absent. */
  limit?: number;
}

/** The member's own requests, newest first, one page at a time. */
export function useMyLeave(filter: MyLeaveFilter = { scope: "all" }) {
  return useInfiniteQuery({
    queryKey: leaveKeys.minePage(filter.scope, filter.limit ?? null),
    initialPageParam: null as string | null,
    queryFn: async (ctx: QueryFunctionContext<readonly unknown[], string | null>) => {
      const response = await api.my.leave.$get(
        {
          query: {
            status: filter.scope,
            limit: match(filter.limit)
              .with(undefined, () => undefined)
              .otherwise((limit) => String(limit)),
            cursor: ctx.pageParam ?? undefined,
          },
        },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load your leave requests.");

      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export type LeaveRequest = NonNullable<ReturnType<typeof useLeaveQueue>["data"]>[number];
