import { z } from "@hono/zod-openapi";

/**
 * Where a page of a keyset list ends: the sort column as Postgres printed it,
 * so the next page compares with the same microseconds, and the row id as the
 * tiebreak. Opaque to the client.
 */
export interface Cursor {
  at: string;
  id: string;
}

const cursorSchema = z.object({ at: z.string().min(1).max(64), id: z.string().min(1).max(64) });

export function encodeCursor(cursor: Cursor): string {
  return btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/** Null for anything that is not a cursor this server wrote. */
export function decodeCursor(value: string | undefined): Cursor | null {
  if (!value) return null;

  try {
    const json = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
    const parsed = cursorSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Splits limit + 1 rows into the page and the cursor for what follows. */
export function pageOf<T>(rows: T[], limit: number, cursorOf: (row: T) => Cursor) {
  const items = rows.slice(0, limit);
  const last = items.at(-1);

  return {
    items,
    nextCursor: rows.length > limit && last ? encodeCursor(cursorOf(last)) : null,
  };
}
