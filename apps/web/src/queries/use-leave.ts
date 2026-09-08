import { leaveKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
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

/** The member's own requests. */
export function useMyLeave() {
  return useQuery({
    queryKey: leaveKeys.mine(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.my.leave.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, "Could not load your leave requests.");

      return response.json();
    },
  });
}

export type LeaveRequest = NonNullable<ReturnType<typeof useLeaveQueue>["data"]>[number];
