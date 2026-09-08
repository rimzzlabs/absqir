import type { AttendanceStatus } from "@absqir/db/schema";

export type SessionStatus = "scheduled" | "running" | "done";

export interface SessionTimes {
  startsAt: Date;
  endsAt: Date;
  lateAfterMinutes: number;
  opensBeforeMinutes: number;
  openedAt: Date | null;
  closedAt: Date | null;
}

const MINUTE = 60_000;

/** When check-in opens on its own. */
export function opensAt(session: SessionTimes): Date {
  return new Date(session.startsAt.getTime() - session.opensBeforeMinutes * MINUTE);
}

/** The last instant a check-in counts as present. */
export function lateAt(session: SessionTimes): Date {
  return new Date(session.startsAt.getTime() + session.lateAfterMinutes * MINUTE);
}

/**
 * Never stored. `closedAt` wins, then the clock: a session past its end is
 * done even before the close is written, so a page never shows a stale
 * "running" while the finaliser catches up.
 */
export function statusOf(session: SessionTimes, now: Date = new Date()): SessionStatus {
  if (session.closedAt) return "done";
  if (now >= session.endsAt) return "done";
  if (session.openedAt || now >= opensAt(session)) return "running";

  return "scheduled";
}

/** True while a scan or a screen check-in is accepted. */
export function acceptsCheckIns(session: SessionTimes, now: Date = new Date()): boolean {
  return statusOf(session, now) === "running";
}

/** Present or late, judged by the clock, never by who scanned. */
export function statusForCheckIn(session: SessionTimes, at: Date): AttendanceStatus {
  return at <= lateAt(session) ? "present" : "late";
}

/** A session that the clock has ended but nobody closed yet. */
export function needsFinalising(session: SessionTimes, now: Date = new Date()): boolean {
  return session.closedAt === null && now >= session.endsAt;
}
