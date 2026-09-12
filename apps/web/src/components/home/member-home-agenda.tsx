import { formatDate } from "@absqir/core/date";
import { buttonVariants } from "@absqir/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@absqir/ui/card";
import { cn } from "@absqir/ui/lib/utils";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { CalendarBlankIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { MyEventDetails, STRETCHED_TRIGGER } from "@/components/my/my-event-details";
import { EventStatusBadge } from "@/components/shared/status-badge";
import type { MyEvent } from "@/queries/use-my";

export interface MemberHomeAgendaProps {
  events: readonly MyEvent[];
  pending: boolean;
  onPass: (id: string) => void;
  onAskLeave: (event: MyEvent) => void;
}

/** Enough to fill the column without a scroll. */
const PREVIEW = 8;

interface Day {
  iso: string;
  at: Date;
  rows: MyEvent[];
}

/** The rows in day order, each day once. The list arrives soonest first. */
function byDay(events: readonly MyEvent[]): Day[] {
  const days = new Map<string, Day>();

  for (const event of events) {
    const at = new Date(event.startsAt);
    const iso = formatDate(at, "iso");
    const day = days.get(iso) ?? { iso, at, rows: [] };
    day.rows.push(event);
    days.set(iso, day);
  }

  return [...days.values()];
}

/** One line of the agenda. A click opens the event's details. */
function AgendaRow(props: {
  event: MyEvent;
  onPass: (id: string) => void;
  onAskLeave: (event: MyEvent) => void;
}) {
  const { event } = props;
  const row = useRef<HTMLLIElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <li
      ref={row}
      className={cn(
        "relative -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
        open ? "bg-accent/60" : "hover:bg-accent/60",
      )}
    >
      <span className="text-muted-foreground w-11 shrink-0 text-xs tabular-nums">
        {formatDate(new Date(event.startsAt), "time")}
      </span>
      <MyEventDetails
        event={event}
        open={open}
        onOpenChange={setOpen}
        anchor={row}
        onPass={props.onPass}
        onAskLeave={props.onAskLeave}
        trigger={
          <button type="button" className={cn(STRETCHED_TRIGGER, "flex-1 truncate font-medium")}>
            {event.title}
          </button>
        }
      />
      <EventStatusBadge status={event.status} />
    </li>
  );
}

/** The member's next days, as an agenda. */
export function MemberHomeAgenda(props: MemberHomeAgendaProps) {
  const rows = A.filter(props.events, (row) => row.status !== "done").slice(0, PREVIEW);
  const agendaHint =
    rows.length === 0 ? "Nothing is planned for you." : "Soonest first, in your time zone.";
  const days = byDay(rows);
  const today = formatDate(new Date(), "iso");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarBlankIcon />
          Coming up
        </CardTitle>
        <CardDescription>{props.pending ? "Loading your days…" : agendaHint}</CardDescription>
        <CardAction>
          <a href="/my/events" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            All my events
            <CaretRightIcon />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        {props.pending ? (
          <div className="flex flex-col gap-3" aria-busy>
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ) : (
          <ol className="flex flex-col gap-5">
            {A.map(days, (day) => (
              <li key={day.iso} className="flex gap-4">
                <div className="w-12 shrink-0 text-center">
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    {day.iso === today ? "Today" : formatDate(day.at, "weekday")}
                  </span>
                  <span
                    className={cn(
                      "font-heading block text-2xl leading-none font-semibold tabular-nums",
                      day.iso === today ? "text-primary" : "",
                    )}
                  >
                    {formatDate(day.at, "dayOfMonth")}
                  </span>
                </div>
                <ul className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {A.map(day.rows, (event) => (
                    <AgendaRow
                      key={event.id}
                      event={event}
                      onPass={props.onPass}
                      onAskLeave={props.onAskLeave}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
