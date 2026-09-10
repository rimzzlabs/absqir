import { z } from "@hono/zod-openapi";
import { A, O, pipe } from "@mobily/ts-belt";

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

/** None for anything that is not a cursor this server wrote. */
export function decodeCursor(value: string | undefined): O.Option<Cursor> {
  return pipe(
    O.fromFalsy(value),
    O.flatMap((text: string) =>
      O.fromExecution(() => JSON.parse(atob(text.replaceAll("-", "+").replaceAll("_", "/")))),
    ),
    O.flatMap((json: unknown) => O.fromNullable(cursorSchema.safeParse(json).data)),
  );
}

/** Splits limit + 1 rows into the page and the cursor for what follows. */
export function pageOf<T>(rows: T[], limit: number, cursorOf: (row: T) => Cursor) {
  const items = rows.slice(0, limit);

  // The last row of the page, but only when the limit + 1 fetch actually came
  // back with a row after it. Null, not None: this value crosses the wire,
  // where a missing key and an explicit "no next page" do not read the same.
  const nextCursor = pipe(
    A.last(items),
    O.filter(() => rows.length > limit),
    O.map((row: T) => encodeCursor(cursorOf(row))),
    O.toNullable,
  );

  return { items, nextCursor };
}
