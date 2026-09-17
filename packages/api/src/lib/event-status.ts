import { lateAt, opensAt } from "@absqir/core/event-clock";
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

// The page states these two times to the organizer, so they live in core
// and both sides read the same clock.
export { lateAt, opensAt };

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

/**
 * Present or late, judged by the clock, never by who scanned.
 *
 * Narrower than AttendanceStatus on purpose: a
 * check-in can only ever land on one of these two, and callers that offer an
 * organizer a choice need to know the difference.
 */
export function statusForCheckIn(event: EventTimes, at: Date): "present" | "late" {
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
