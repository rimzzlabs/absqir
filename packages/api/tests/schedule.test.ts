import { describe, expect, it } from "vitest";
import { occurrencesBetween } from "@/lib/schedule";

const base = {
  id: "rule",
  organizationId: "org",
  title: "Standup",
  description: null,
  frequency: "weekly" as const,
  weekdays: [1, 3],
  startTime: "09:00",
  durationMinutes: 30,
  lateAfterMinutes: 5,
  opensBeforeMinutes: 10,
  timezone: "Asia/Jakarta",
  startsOn: "2026-09-01",
  endsOn: null,
  active: true,
  allowWalkIns: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("occurrencesBetween", () => {
  it("lands on the wall-clock time in the schedule's zone", () => {
    // 2026-09-07 is a Monday. 09:00 Jakarta is 02:00 UTC.
    const out = occurrencesBetween(
      base,
      new Date("2026-09-07T00:00:00Z"),
      new Date("2026-09-10T00:00:00Z"),
    );

    expect(out.map((d) => d.toISOString())).toEqual([
      "2026-09-07T02:00:00.000Z",
      "2026-09-09T02:00:00.000Z",
    ]);
  });

  it("stops at endsOn and starts at startsOn", () => {
    const rule = {
      ...base,
      frequency: "daily" as const,
      weekdays: [],
      startsOn: "2026-09-08",
      endsOn: "2026-09-09",
    };
    const out = occurrencesBetween(
      rule,
      new Date("2026-09-01T00:00:00Z"),
      new Date("2026-09-20T00:00:00Z"),
    );

    expect(out.map((d) => d.toISOString())).toEqual([
      "2026-09-08T02:00:00.000Z",
      "2026-09-09T02:00:00.000Z",
    ]);
  });

  it("skips an occurrence already in the past", () => {
    const out = occurrencesBetween(
      base,
      new Date("2026-09-07T03:00:00Z"),
      new Date("2026-09-10T00:00:00Z"),
    );

    expect(out.map((d) => d.toISOString())).toEqual(["2026-09-09T02:00:00.000Z"]);
  });
});
