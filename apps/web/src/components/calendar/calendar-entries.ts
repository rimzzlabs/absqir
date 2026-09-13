import { formatDate } from "@absqir/core/date";
import { A } from "@mobily/ts-belt";
import { match } from "ts-pattern";
import type { CalendarEvent, ProjectedEvent } from "@/queries/use-calendar";

/** One line in a day cell: a real event, or one a schedule still owes. */
export type CalendarEntry =
  | { kind: "event"; key: string; startsAt: Date; endsAt: Date; event: CalendarEvent }
  | { kind: "projected"; key: string; startsAt: Date; endsAt: Date; title: string };

export function entryTitle(entry: CalendarEntry): string {
  return match(entry)
    .with({ kind: "event" }, (entry) => entry.event.title)
    .otherwise((entry) => entry.title);
}

/** The map key for a day, in the display zone, so a cell holds the account's own day. */
export function dayKey(date: Date): string {
  return formatDate(date, "iso");
}

/** Everything the calendar knows, bucketed by the day it starts on. */
export function entriesByDay(data: {
  events: CalendarEvent[];
  projected: ProjectedEvent[];
}): Map<string, CalendarEntry[]> {
  const entries: CalendarEntry[] = [
    ...A.map(
      data.events,
      (event): CalendarEntry => ({
        kind: "event",
        key: event.id,
        startsAt: new Date(event.startsAt),
        endsAt: new Date(event.endsAt),
        event,
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
