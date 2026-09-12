import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  formatDate,
  inDisplayZone,
  nowInDisplayZone,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "@absqir/core/date";
import { Button } from "@absqir/ui/button";
import { Skeleton } from "@absqir/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@absqir/ui/toggle-group";
import { CaretLeftIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import { match } from "ts-pattern";
import { type CalendarEntry, entriesByDay } from "@/components/calendar/calendar-entries";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { DaySheet } from "@/components/calendar/day-sheet";
import { EventDialog } from "@/components/events/event-dialog";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { parseAsLocalDate } from "@/lib/url-state";
import { useCalendar } from "@/queries/use-calendar";

type CalendarView = "month" | "week";

/** Monday starts the week, the way the rest of the app reads a schedule. */
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

function visibleRange(view: CalendarView, cursor: Date) {
  if (view === "week") {
    return {
      from: startOfWeek(cursor, WEEK_OPTIONS),
      to: endOfWeek(cursor, WEEK_OPTIONS),
    };
  }

  return {
    from: startOfWeek(startOfMonth(cursor), WEEK_OPTIONS),
    to: endOfWeek(endOfMonth(cursor), WEEK_OPTIONS),
  };
}

function headerLabel(view: CalendarView, cursor: Date): string {
  if (view === "month") return formatDate(cursor, "monthYear");

  const from = startOfWeek(cursor, WEEK_OPTIONS);
  const to = endOfWeek(cursor, WEEK_OPTIONS);

  return `${formatDate(from, "dayMonth")} to ${formatDate(to, "date")}`;
}

const PARAMS = {
  view: parseAsStringLiteral(["month", "week"] as const satisfies CalendarView[]).withDefault(
    "month",
  ),
  date: parseAsLocalDate,
};

/**
 * Midnight today in the display zone. Every day the grid draws descends
 * from this date or from the one in the URL, and date-fns keeps the zone
 * through the arithmetic, so a cell holds the account's day, not the
 * browser's.
 */
function today() {
  return startOfDay(nowInDisplayZone());
}

function CalendarBody() {
  const [params, setParams] = useQueryStates(PARAMS);
  const view = params.view;
  const cursor = params.date ?? today();
  const setView = (next: CalendarView) => void setParams({ view: next });
  const setCursor = (next: Date) => void setParams({ date: next });
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const [newEventDay, setNewEventDay] = useState<Date | null>(null);

  const range = useMemo(() => visibleRange(view, cursor), [view, cursor]);
  const calendar = useCalendar(startOfDay(range.from), endOfDay(range.to));

  const days = useMemo(
    () => eachDayOfInterval({ start: range.from, end: range.to }),
    [range.from, range.to],
  );

  const entries = useMemo(
    () => entriesByDay(calendar.data ?? { events: [], projected: [] }),
    [calendar.data],
  );

  const step = (direction: 1 | -1) => {
    setCursor(view === "month" ? addMonths(cursor, direction) : addDays(cursor, direction * 7));
  };

  const openEntry = (entry: CalendarEntry) => {
    if (entry.kind === "event") {
      window.location.href = `/events/${entry.event.id}`;
      return;
    }

    setOpenDay(startOfDay(inDisplayZone(entry.startsAt)));
  };

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Every event on one grid, with the ones your schedules still owe."
        actions={
          <Button size="sm" onClick={() => setNewEventDay(new Date())}>
            <PlusIcon />
            New event
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous" onClick={() => step(-1)}>
            <CaretLeftIcon />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next" onClick={() => step(1)}>
            <CaretRightIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(today())}>
            Today
          </Button>
          <h2 className="font-heading ml-2 text-lg font-semibold">{headerLabel(view, cursor)}</h2>
        </div>

        <ToggleGroup
          value={[view]}
          onValueChange={(value) => {
            const next = value[0] as CalendarView | undefined;
            if (next) setView(next);
          }}
          variant="outline"
        >
          <ToggleGroupItem value="month">Month</ToggleGroupItem>
          <ToggleGroupItem value="week">Week</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {calendar.isError ? <FormError error={calendar.error} /> : null}

      {match(calendar)
        .with({ isPending: true }, () => <Skeleton className="h-[32rem] rounded-xl" />)
        .otherwise(() => (
          <CalendarGrid
            days={days}
            month={cursor}
            view={view}
            entries={entries}
            onOpenDay={setOpenDay}
            onNewEvent={setNewEventDay}
            onOpenEntry={openEntry}
          />
        ))}

      <DaySheet
        day={openDay}
        entries={entries}
        onClose={() => setOpenDay(null)}
        onNewEvent={(day) => {
          setOpenDay(null);
          setNewEventDay(day);
        }}
      />

      <EventDialog
        open={newEventDay !== null}
        onOpenChange={(open) => !open && setNewEventDay(null)}
        event={null}
        initialStart={newEventDay}
      />
    </>
  );
}

export function CalendarPage() {
  return (
    <Providers>
      <CalendarBody />
    </Providers>
  );
}
