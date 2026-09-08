import { describe, expect, it } from "vitest";
import { cursorOf, splitNew } from "../src/lib/notification-stream";
import type { NotificationRow } from "../src/lib/notifications";

function row(id: string, createdAt: string): NotificationRow {
  return {
    id,
    organizationId: "org",
    userId: "user",
    type: "session-reminder",
    title: id,
    body: null,
    href: null,
    dedupeKey: null,
    readAt: null,
    createdAt: new Date(createdAt),
  };
}

describe("cursorOf", () => {
  it("reads an ISO instant", () => {
    expect(cursorOf("2026-09-09T10:00:00.000Z")?.toISOString()).toBe("2026-09-09T10:00:00.000Z");
  });

  it("drops garbage and absence", () => {
    expect(cursorOf("yesterday")).toBeNull();
    expect(cursorOf(undefined)).toBeNull();
  });
});

describe("splitNew", () => {
  it("moves the cursor to the last row and remembers what sits on it", () => {
    const rows = [
      row("a", "2026-09-09T10:00:00.000Z"),
      row("b", "2026-09-09T10:00:05.000Z"),
      row("c", "2026-09-09T10:00:05.000Z"),
    ];

    const split = splitNew(rows, new Set());

    expect(split.fresh.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(split.cursor?.toISOString()).toBe("2026-09-09T10:00:05.000Z");
    expect([...split.onCursor]).toEqual(["b", "c"]);
  });

  it("filters the rows already sent, so the inclusive query repeats nothing", () => {
    const rows = [row("b", "2026-09-09T10:00:05.000Z"), row("c", "2026-09-09T10:00:05.000Z")];

    const split = splitNew(rows, new Set(["b", "c"]));

    expect(split.fresh).toEqual([]);
    expect(split.cursor).toBeNull();
    expect([...split.onCursor]).toEqual(["b", "c"]);
  });
});
