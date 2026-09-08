import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
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
import { Providers } from "@/components/providers";
import { SessionDialog } from "@/components/sessions/session-dialog";
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
  const month = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  if (view === "month") return month;

  const from = startOfWeek(cursor, WEEK_OPTIONS);
  const to = endOfWeek(cursor, WEEK_OPTIONS);

  return `${from.toLocaleDateString(undefined, { day: "numeric", month: "short" })} to ${to.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

const PARAMS = {
  view: parseAsStringLiteral(["month", "week"] as const satisfies CalendarView[]).withDefault(
    "month",
  ),
  date: parseAsLocalDate,
};

function today() {
  return startOfDay(new Date());
}

function CalendarBody() {
  const [params, setParams] = useQueryStates(PARAMS);
  const view = params.view;
  const cursor = params.date ?? today();
  const setView = (next: CalendarView) => void setParams({ view: next });
  const setCursor = (next: Date) => void setParams({ date: next });
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const [newSessionDay, setNewSessionDay] = useState<Date | null>(null);

  const range = useMemo(() => visibleRange(view, cursor), [view, cursor]);
  const calendar = useCalendar(startOfDay(range.from), endOfDay(range.to));

  const days = useMemo(
    () => eachDayOfInterval({ start: range.from, end: range.to }),
    [range.from, range.to],
  );

  const entries = useMemo(
    () => entriesByDay(calendar.data ?? { sessions: [], projected: [] }),
    [calendar.data],
  );

  const step = (direction: 1 | -1) => {
    setCursor(view === "month" ? addMonths(cursor, direction) : addDays(cursor, direction * 7));
  };

  const openEntry = (entry: CalendarEntry) => {
    if (entry.kind === "session") {
      window.location.href = `/sessions/${entry.session.id}`;
      return;
    }

    setOpenDay(startOfDay(entry.startsAt));
  };

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Every session on one grid, with the ones your schedules still owe."
        actions={
          <Button size="sm" onClick={() => setNewSessionDay(new Date())}>
            <PlusIcon />
            New session
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
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
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
            onNewSession={setNewSessionDay}
            onOpenEntry={openEntry}
          />
        ))}

      <DaySheet
        day={openDay}
        entries={entries}
        onClose={() => setOpenDay(null)}
        onNewSession={(day) => {
          setOpenDay(null);
          setNewSessionDay(day);
        }}
      />

      <SessionDialog
        open={newSessionDay !== null}
        onOpenChange={(open) => !open && setNewSessionDay(null)}
        session={null}
        initialStart={newSessionDay}
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
