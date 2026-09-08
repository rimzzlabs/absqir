import { notificationKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export type NotificationScope = "all" | "unread";

export function useNotifications(scope: NotificationScope = "all") {
  return useQuery({
    queryKey: notificationKeys.list(scope),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.notifications.$get(
        { query: { scope } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load your notifications.");

      return response.json();
    },
  });
}

/** Feeds the badge in the header, so it polls and nothing else does. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.notifications["unread-count"].$get(undefined, {
        init: { signal: ctx.signal },
      });

      if (!response.ok) throw await apiError(response, "Could not count your notifications.");

      return response.json();
    },
    refetchInterval: 60_000,
  });
}

export type Notification = NonNullable<ReturnType<typeof useNotifications>["data"]>[number];
