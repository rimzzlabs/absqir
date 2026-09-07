import { describe, expect, it } from "vitest";
import { daysUntil, formatDate, isExpired } from "@/date";

const REFERENCE = new Date("2026-09-07T10:30:00.000Z");

describe("date", () => {
  it("formats one intent per call", () => {
    expect(formatDate(REFERENCE, "iso")).toBe("2026-09-07");
    expect(formatDate(REFERENCE, "date")).toBe("7 Sep 2026");
  });

  it("reports an expiry against a fixed now", () => {
    const past = new Date("2026-09-06T00:00:00.000Z");
    const future = new Date("2026-09-08T00:00:00.000Z");

    expect(isExpired(past, REFERENCE)).toBe(true);
    expect(isExpired(future, REFERENCE)).toBe(false);
  });

  it("counts calendar days", () => {
    expect(daysUntil(new Date("2026-09-10T00:00:00.000Z"), REFERENCE)).toBe(3);
  });
});
