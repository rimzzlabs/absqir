import { formatDate } from "@absqir/core/date";
import type { CalendarSession, ProjectedSession } from "@/queries/use-calendar";

/** One line in a day cell: a real session, or one a schedule still owes. */
export type CalendarEntry =
  | { kind: "session"; key: string; startsAt: Date; endsAt: Date; session: CalendarSession }
  | { kind: "projected"; key: string; startsAt: Date; endsAt: Date; title: string };

export function entryTitle(entry: CalendarEntry): string {
  return entry.kind === "session" ? entry.session.title : entry.title;
}

/** The map key for a day. Local time, so a cell holds the reader's own day. */
export function dayKey(date: Date): string {
  return formatDate(date, "iso");
}

/** Everything the calendar knows, bucketed by the day it starts on. */
export function entriesByDay(data: {
  sessions: CalendarSession[];
  projected: ProjectedSession[];
}): Map<string, CalendarEntry[]> {
  const entries: CalendarEntry[] = [
    ...data.sessions.map(
      (session): CalendarEntry => ({
        kind: "session",
        key: session.id,
        startsAt: new Date(session.startsAt),
        endsAt: new Date(session.endsAt),
        session,
      }),
    ),
    ...data.projected.map(
      (row): CalendarEntry => ({
        kind: "projected",
        key: `${row.scheduleId}:${row.startsAt}`,
        startsAt: new Date(row.startsAt),
        endsAt: new Date(row.endsAt),
        title: row.title,
      }),
    ),
  ];

  const map = new Map<string, CalendarEntry[]>();

  for (const entry of entries.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
    const key = dayKey(entry.startsAt);
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }

  return map;
}
