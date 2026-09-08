import { notificationKeys } from "@absqir/core/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";

const STREAM_PATH = "/api/notifications/stream";

const eventSchema = z.object({
  count: z.number(),
  rows: z.array(z.object({ id: z.string() })),
});

/**
 * Keeps the notification cache live through server-sent events. Each event
 * carries the unread count and the rows written since the last one. The
 * count lands in the cache as is; new rows send the lists back to the server,
 * which is cheaper than merging and cannot drift.
 *
 * The browser reconnects on its own and sends the last event id back, so a
 * gap is closed on the server. A reconnect still refetches everything once,
 * in case the gap was longer than the server keeps.
 */
export function useNotificationStream() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    const source = new EventSource(STREAM_PATH);
    let connectedBefore = false;

    const onOpen = () => {
      if (connectedBefore) {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }
      connectedBefore = true;
    };

    const onEvent = (event: MessageEvent<string>) => {
      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      const parsed = eventSchema.safeParse(payload);
      if (!parsed.success) return;

      queryClient.setQueryData(notificationKeys.unread(), { count: parsed.data.count });

      if (parsed.data.rows.length > 0) {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      }
    };

    source.addEventListener("open", onOpen);
    source.addEventListener("notifications", onEvent);

    return () => {
      source.removeEventListener("open", onOpen);
      source.removeEventListener("notifications", onEvent);
      source.close();
    };
  }, [queryClient]);
}
