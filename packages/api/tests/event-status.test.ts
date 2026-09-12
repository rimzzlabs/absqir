import { describe, expect, it } from "vitest";
import {
  acceptsCheckIns,
  isBackfill,
  needsFinalising,
  statusForCheckIn,
  statusOf,
} from "#src/lib/event-status";

const at = (iso: string) => new Date(iso);

const event = {
  startsAt: at("2026-09-08T09:00:00Z"),
  endsAt: at("2026-09-08T10:00:00Z"),
  lateAfterMinutes: 15,
  opensBeforeMinutes: 10,
  openedAt: null,
  closedAt: null,
};

describe("statusOf", () => {
  it("is scheduled before check-in opens", () => {
    expect(statusOf(event, at("2026-09-08T08:49:00Z"))).toBe("scheduled");
  });

  it("is running from opensBefore until the end", () => {
    expect(statusOf(event, at("2026-09-08T08:50:00Z"))).toBe("running");
    expect(statusOf(event, at("2026-09-08T09:59:59Z"))).toBe("running");
  });

  it("is done at the end even before anyone closed it", () => {
    expect(statusOf(event, at("2026-09-08T10:00:00Z"))).toBe("done");
    expect(needsFinalising(event, at("2026-09-08T10:00:00Z"))).toBe(true);
  });

  it("runs early when an organizer opened it", () => {
    const opened = { ...event, openedAt: at("2026-09-08T08:00:00Z") };
    expect(statusOf(opened, at("2026-09-08T08:01:00Z"))).toBe("running");
  });

  it("is done once closed, whatever the clock says", () => {
    const closed = { ...event, closedAt: at("2026-09-08T09:30:00Z") };
    expect(statusOf(closed, at("2026-09-08T09:31:00Z"))).toBe("done");
    expect(acceptsCheckIns(closed, at("2026-09-08T09:31:00Z"))).toBe(false);
    expect(needsFinalising(closed, at("2026-09-08T11:00:00Z"))).toBe(false);
  });
});

describe("statusForCheckIn", () => {
  it("is present up to the late threshold and late after", () => {
    expect(statusForCheckIn(event, at("2026-09-08T09:15:00Z"))).toBe("present");
    expect(statusForCheckIn(event, at("2026-09-08T09:15:01Z"))).toBe("late");
  });
});

describe("isBackfill", () => {
  it("is true when the event ended before it was written", () => {
    expect(isBackfill({ ...event, createdAt: at("2026-09-08T10:00:00Z") })).toBe(true);
    expect(isBackfill({ ...event, createdAt: at("2026-09-09T08:00:00Z") })).toBe(true);
  });

  it("is false for an event written ahead of its end", () => {
    expect(isBackfill({ ...event, createdAt: at("2026-09-08T09:59:59Z") })).toBe(false);
    expect(isBackfill({ ...event, createdAt: at("2026-09-01T09:00:00Z") })).toBe(false);
  });
});
