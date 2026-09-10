import { O } from "@mobily/ts-belt";
import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, pageOf } from "#src/lib/cursor";

describe("cursor", () => {
  it("round-trips through a url-safe string", () => {
    const cursor = { at: "2026-09-09 13:15:00.123456+07", id: "abc" };
    const encoded = encodeCursor(cursor);

    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it("rejects what it did not write", () => {
    expect(O.isNone(decodeCursor(undefined))).toBe(true);
    expect(O.isNone(decodeCursor(""))).toBe(true);
    expect(O.isNone(decodeCursor("not-base64!"))).toBe(true);
    expect(O.isNone(decodeCursor(btoa('{"at":1}')))).toBe(true);
  });

  it("keeps limit rows and points past the last one", () => {
    const rows = [1, 2, 3, 4];
    const page = pageOf(rows, 3, (row) => ({ at: String(row), id: String(row) }));

    expect(page.items).toEqual([1, 2, 3]);
    expect(decodeCursor(page.nextCursor ?? "")).toEqual({ at: "3", id: "3" });
    expect(
      pageOf([1, 2], 3, (row) => ({ at: String(row), id: String(row) })).nextCursor,
    ).toBeNull();
  });

  it("stops at a page that lands exactly on the limit", () => {
    // Callers fetch limit + 1, so limit rows back means nothing follows. A
    // cursor here would cost every full last page one more empty request.
    expect(
      pageOf([1, 2, 3], 3, (row) => ({ at: String(row), id: String(row) })).nextCursor,
    ).toBeNull();
  });
});
