import { describe, expect, it } from "vitest";
import {
  type EventRateRow,
  eventRateSeries,
  type GroupRateRow,
  groupRateSeries,
} from "#src/attendance-series";

const events: EventRateRow[] = [
  { eventId: "e-3", title: "Friday", startsAt: "2026-09-11T09:00:00.000Z", attendanceRate: 0.5 },
  { eventId: "e-2", title: "Thursday", startsAt: "2026-09-10T09:00:00.000Z", attendanceRate: null },
  { eventId: "e-1", title: "Monday", startsAt: "2026-09-07T09:00:00.000Z", attendanceRate: 0.875 },
];

const groups: GroupRateRow[] = [
  { groupId: "g-1", name: "Engineering", attendanceRate: 0.9 },
  { groupId: "g-2", name: "Sales", attendanceRate: 0.4 },
  { groupId: "g-3", name: "Nobody judged", attendanceRate: null },
  { groupId: "g-4", name: "Support", attendanceRate: 0.65 },
];

describe("eventRateSeries", () => {
  it("runs oldest first, whatever order the report arrives in", () => {
    const points = eventRateSeries(events);

    expect(points.map((point) => point.key)).toEqual(["e-1", "e-3"]);
  });

  it("leaves out an event that has not closed, because null is not zero", () => {
    const points = eventRateSeries(events);

    expect(points.map((point) => point.key)).not.toContain("e-2");
  });

  it("rounds a rate to a whole percent", () => {
    const points = eventRateSeries(events);

    expect(points).toEqual([
      { key: "e-1", label: "Monday", percent: 88 },
      { key: "e-3", label: "Friday", percent: 50 },
    ]);
  });

  it("returns nothing before the first event closes", () => {
    expect(eventRateSeries([{ ...events[0], attendanceRate: null } as EventRateRow])).toEqual([]);
    expect(eventRateSeries([])).toEqual([]);
  });
});

describe("groupRateSeries", () => {
  it("puts the worst group first", () => {
    const points = groupRateSeries(groups);

    expect(points.map((point) => point.label)).toEqual(["Sales", "Support", "Engineering"]);
  });

  it("leaves out a group nothing judged", () => {
    const points = groupRateSeries(groups);

    expect(points.map((point) => point.key)).not.toContain("g-3");
  });

  it("reads a rate as a whole percent", () => {
    const points = groupRateSeries([{ groupId: "g-1", name: "One", attendanceRate: 0.333 }]);

    expect(points[0]?.percent).toBe(33);
  });
});
