import type { AttendanceStatus } from "@absqir/db/schema";
import { match } from "ts-pattern";

export type EventStatus = "scheduled" | "running" | "done";

export interface EventTimes {
  startsAt: Date;
  endsAt: Date;
  lateAfterMinutes: number;
  opensBeforeMinutes: number;
  openedAt: Date | null;
  closedAt: Date | null;
}

const MINUTE = 60_000;

/** When check-in opens on its own. */
export function opensAt(event: EventTimes): Date {
  return new Date(event.startsAt.getTime() - event.opensBeforeMinutes * MINUTE);
}

/** The last instant a check-in counts as present. */
export function lateAt(event: EventTimes): Date {
  return new Date(event.startsAt.getTime() + event.lateAfterMinutes * MINUTE);
}

/**
 * Never stored. `closedAt` wins, then the clock: an event past its end is
 * done even before the close is written, so a page never shows a stale
 * "running" while the finaliser catches up.
 */
export function statusOf(event: EventTimes, now: Date = new Date()): EventStatus {
  if (event.closedAt) return "done";
  if (now >= event.endsAt) return "done";
  if (event.openedAt || now >= opensAt(event)) return "running";

  return "scheduled";
}

/** True while a scan or a screen check-in is accepted. */
export function acceptsCheckIns(event: EventTimes, now: Date = new Date()): boolean {
  return statusOf(event, now) === "running";
}

/** Present or late, judged by the clock, never by who scanned. */
export function statusForCheckIn(event: EventTimes, at: Date): AttendanceStatus {
  return match(at <= lateAt(event))
    .with(true, () => "present" as const)
    .otherwise(() => "late" as const);
}

/** An event that the clock has ended but nobody closed yet. */
export function needsFinalising(event: EventTimes, now: Date = new Date()): boolean {
  return event.closedAt === null && now >= event.endsAt;
}

/**
 * An event written after it ended: a record of something that already
 * happened, not an event to watch. Nobody needs to hear that it closed.
 */
export function isBackfill(event: { endsAt: Date; createdAt: Date }): boolean {
  return event.endsAt <= event.createdAt;
}
