import { joinRequestKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export type JoinRequestStatusFilter = "pending" | "decided" | "all";

/** Who asks to join the active organization. Admins and owners only. */
export function useJoinRequests(status: JoinRequestStatusFilter = "pending") {
  return useQuery({
    queryKey: joinRequestKeys.list(status),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.organizations["join-requests"].$get(
        { query: { status } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not read the requests.");

      return response.json();
    },
  });
}

export type JoinRequest = NonNullable<ReturnType<typeof useJoinRequests>["data"]>["items"][number];
