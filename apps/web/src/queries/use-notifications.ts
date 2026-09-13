import { notificationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export type NotificationScope = "all" | "unread";

export interface UseNotificationsOptions {
  /** False keeps the list cold until something shows it. */
  enabled?: boolean;
}

export function useNotifications(
  scope: NotificationScope = "all",
  options: UseNotificationsOptions = {},
) {
  const t = useTranslate();
  return useQuery({
    queryKey: notificationKeys.list(scope),
    enabled: options.enabled ?? true,
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.notifications.$get(
        { query: { scope } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadYourNotifications"));

      return response.json();
    },
  });
}

/**
 * Feeds the badge in the header. The stream keeps it current; the poll is
 * the fallback for a browser that lost the stream.
 */
export function useUnreadCount() {
  const t = useTranslate();
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.notifications["unread-count"].$get(undefined, {
        init: { signal: ctx.signal },
      });

      if (!response.ok) throw await apiError(response, t("errors:couldNotCountYourNotifications"));

      return response.json();
    },
    refetchInterval: 60_000,
  });
}

export type Notification = NonNullable<ReturnType<typeof useNotifications>["data"]>[number];
