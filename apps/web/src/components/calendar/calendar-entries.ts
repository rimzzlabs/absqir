import { formatDate } from "@absqir/core/date";
import { A } from "@mobily/ts-belt";
import type { CalendarSession, ProjectedSession } from "@/queries/use-calendar";

/** One line in a day cell: a real event, or one a schedule still owes. */
export type CalendarEntry =
  | { kind: "session"; key: string; startsAt: Date; endsAt: Date; session: CalendarSession }
  | { kind: "projected"; key: string; startsAt: Date; endsAt: Date; title: string };

export function entryTitle(entry: CalendarEntry): string {
  return entry.kind === "session" ? entry.session.title : entry.title;
}

/** The map key for a day, in the display zone, so a cell holds the account's own day. */
export function dayKey(date: Date): string {
  return formatDate(date, "iso");
}

/** Everything the calendar knows, bucketed by the day it starts on. */
export function entriesByDay(data: {
  sessions: CalendarSession[];
  projected: ProjectedSession[];
}): Map<string, CalendarEntry[]> {
  const entries: CalendarEntry[] = [
    ...A.map(
      data.sessions,
      (session): CalendarEntry => ({
        kind: "session",
        key: session.id,
        startsAt: new Date(session.startsAt),
        endsAt: new Date(session.endsAt),
        session,
      }),
    ),
    ...A.map(
      data.projected,
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

  for (const entry of A.sort(entries, (a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
    const key = dayKey(entry.startsAt);
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }

  return map;
}
