import { formatDate, isSameMonth, isToday } from "@absqir/core/date";
import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { PlusIcon, RepeatIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";
import { type CalendarEntry, dayKey, entryTitle } from "@/components/calendar/calendar-entries";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** How many entries a month cell shows before it says how many are left. */
const MONTH_CELL_LIMIT = 3;

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-muted-foreground",
  running: "bg-emerald-500",
  done: "bg-border",
};

function EntryLine(props: { entry: CalendarEntry; onOpen: (entry: CalendarEntry) => void }) {
  const { entry } = props;
  const projected = entry.kind === "projected";

  return (
    <button
      type="button"
      onClick={() => props.onOpen(entry)}
      title={match(projected)
        .with(true, () => "A schedule will create this one")
        .otherwise(() => undefined)}
      className={cn(
        "hover:bg-muted flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs",
        projected && "text-muted-foreground",
      )}
    >
      {match(entry)
        .with({ kind: "projected" }, () => <RepeatIcon className="size-3 shrink-0" />)
        .otherwise((entry) => (
          <span
            aria-hidden
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              STATUS_DOT[entry.event.status] ?? "bg-muted-foreground",
            )}
          />
        ))}
      <span className="tabular-nums">{formatDate(entry.startsAt, "time")}</span>
      <span className="truncate">{entryTitle(entry)}</span>
    </button>
  );
}

export interface CalendarGridProps {
  days: Date[];
  /** The month the header names. Days outside it read as quiet. */
  month: Date;
  view: "month" | "week";
  entries: Map<string, CalendarEntry[]>;
  onOpenDay: (day: Date) => void;
  onNewEvent: (day: Date) => void;
  onOpenEntry: (entry: CalendarEntry) => void;
}

/**
 * Seven columns, one row per week. The month view caps each cell and says
 * how many entries it hid; the week view has the height to show them all.
 */
export function CalendarGrid(props: CalendarGridProps) {
  const limit = match(props.view)
    .with("month", () => MONTH_CELL_LIMIT)
    .otherwise(() => Number.POSITIVE_INFINITY);

  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <div className="bg-muted/40 text-muted-foreground border-border grid min-w-160 grid-cols-7 border-b text-xs font-medium">
        {A.map(WEEKDAY_LABELS, (label) => (
          <div key={label} className="px-2 py-2 text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="divide-border grid min-w-160 grid-cols-7 divide-x divide-y">
        {A.map(props.days, (day) => {
          const list = props.entries.get(dayKey(day)) ?? [];
          const outside = props.view === "month" && !isSameMonth(day, props.month);
          const shown = list.slice(0, limit);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "group/day flex flex-col gap-1 p-1.5",
                match(props.view)
                  .with("month", () => "min-h-28" as const)
                  .otherwise(() => "min-h-72" as const),
                outside && "bg-muted/20",
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => props.onOpenDay(day)}
                  aria-label={`What happens on ${formatDate(day, "date")}`}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                    match(isToday(day))
                      .with(true, () => "bg-primary text-primary-foreground font-semibold" as const)
                      .otherwise(() => "hover:bg-muted" as const),
                    outside && "text-muted-foreground",
                  )}
                >
                  {day.getDate()}
                </button>

                <button
                  type="button"
                  onClick={() => props.onNewEvent(day)}
                  aria-label={`New event on ${formatDate(day, "date")}`}
                  className="text-muted-foreground hover:bg-muted rounded p-0.5 opacity-0 group-hover/day:opacity-100 focus-visible:opacity-100"
                >
                  <PlusIcon className="size-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-0.5">
                {A.map(shown, (entry) => (
                  <EntryLine key={entry.key} entry={entry} onOpen={props.onOpenEntry} />
                ))}
                {match(list.length > shown.length)
                  .with(true, () => (
                    <button
                      type="button"
                      onClick={() => props.onOpenDay(day)}
                      className="text-muted-foreground hover:text-foreground px-1 text-left text-xs"
                    >
                      {list.length - shown.length} more
                    </button>
                  ))
                  .otherwise(() => null)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
