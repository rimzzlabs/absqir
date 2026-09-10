import { createDb, type Database } from "@absqir/db";
import { A, pipe } from "@mobily/ts-belt";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import {
  listNotificationsSince,
  type NotificationRow,
  toNotificationJson,
  unreadCount,
} from "#src/lib/notifications";
import type { AppEnv } from "#src/types";

/** How often an open stream asks the database. The delay a reader sees. */
export const POLL_MS = 5_000;
/** A comment goes out this often when nothing else did, so proxies keep the line. */
export const HEARTBEAT_MS = 25_000;

export interface StreamEvent {
  count: number;
  rows: readonly ReturnType<typeof toNotificationJson>[];
}

/** The cursor a client sends back: the id of the last event it saw. */
export function cursorOf(value: string | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Keeps the rows that sit on the cursor out of the next poll. The query is
 * inclusive on purpose, see listNotificationsSince.
 */
export function splitNew(
  rows: NotificationRow[],
  seen: ReadonlySet<string>,
): { fresh: readonly NotificationRow[]; cursor: Date | null; onCursor: Set<string> } {
  const fresh = A.filter(rows, (row) => !seen.has(row.id));
  const last = fresh.at(-1);
  if (!last) return { fresh, cursor: null, onCursor: new Set(seen) };

  const cursor = last.createdAt;
  const onCursor = new Set(
    pipe(
      rows,
      A.filter((row) => row.createdAt.getTime() === cursor.getTime()),
      A.map((row) => row.id),
    ),
  );

  return { fresh, cursor, onCursor };
}

/**
 * Server-sent events for one reader in one organization. Every poll sends
 * the unread count and the rows written since the last event, and stays
 * quiet when neither changed. Works the same on Node and on Workers, where
 * no request can wake another: the database is the only shared place.
 */
export function notificationStream(
  c: Context<AppEnv>,
  userId: string,
  organizationId: string,
): Response {
  const since = cursorOf(c.req.header("last-event-id") ?? c.req.query("after"));

  // The request context releases its pool as soon as this handler returns,
  // which on Workers is long before the stream ends. So the stream owns one.
  const owned = c.env.SHARED_DB
    ? null
    : createDb({ connectionString: c.env.HYPERDRIVE.connectionString, max: 1 });
  const db: Database = owned?.db ?? c.var.db;

  return streamSSE(c, async (stream) => {
    let cursor = since ?? new Date();
    let seen = new Set<string>();
    let lastCount = -1;
    let lastWrite = Date.now();
    let open = true;

    stream.onAbort(() => {
      open = false;
    });

    const poll = async () => {
      const [rows, count] = await Promise.all([
        listNotificationsSince(db, userId, organizationId, cursor),
        unreadCount(db, userId, organizationId),
      ]);

      const split = splitNew(rows, seen);
      if (split.cursor) cursor = split.cursor;
      seen = split.onCursor;

      if (split.fresh.length === 0 && count === lastCount) return;

      lastCount = count;
      lastWrite = Date.now();
      const event: StreamEvent = { count, rows: A.map(split.fresh, toNotificationJson) };

      await stream.writeSSE({
        event: "notifications",
        id: cursor.toISOString(),
        data: JSON.stringify(event),
      });
    };

    try {
      while (open) {
        await poll();

        if (Date.now() - lastWrite >= HEARTBEAT_MS) {
          lastWrite = Date.now();
          await stream.write(": keep-alive\n\n");
        }

        await stream.sleep(POLL_MS);
      }
    } finally {
      await owned?.close();
    }
  });
}
