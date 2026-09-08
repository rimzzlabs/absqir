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
import { CalendarBlankIcon, CaretRightIcon } from "@phosphor-icons/react";
import { SessionStatusBadge } from "@/components/shared/status-badge";
import type { MySession } from "@/queries/use-my";

export interface MemberHomeAgendaProps {
  sessions: MySession[];
  pending: boolean;
}

/** Enough to fill the column without a scroll. */
const PREVIEW = 8;

interface Day {
  iso: string;
  at: Date;
  rows: MySession[];
}

/** The rows in day order, each day once. The list arrives soonest first. */
function byDay(sessions: MySession[]): Day[] {
  const days = new Map<string, Day>();

  for (const session of sessions) {
    const at = new Date(session.startsAt);
    const iso = formatDate(at, "iso");
    const day = days.get(iso) ?? { iso, at, rows: [] };
    day.rows.push(session);
    days.set(iso, day);
  }

  return [...days.values()];
}

/** The member's next days, as an agenda. */
export function MemberHomeAgenda(props: MemberHomeAgendaProps) {
  const rows = props.sessions.filter((row) => row.status !== "done").slice(0, PREVIEW);
  const days = byDay(rows);
  const today = formatDate(new Date(), "iso");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarBlankIcon />
          Coming up
        </CardTitle>
        <CardDescription>
          {props.pending
            ? "Loading your days…"
            : rows.length === 0
              ? "Nothing is planned for you."
              : "Soonest first, in your time zone."}
        </CardDescription>
        <CardAction>
          <a href="/my/sessions" className={buttonVariants({ variant: "ghost", size: "sm" })}>
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
            {days.map((day) => (
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
                <ul className="divide-border min-w-0 flex-1 divide-y">
                  {day.rows.map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0"
                    >
                      <span className="text-muted-foreground w-11 shrink-0 text-xs tabular-nums">
                        {formatDate(new Date(session.startsAt), "time")}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{session.title}</span>
                      <SessionStatusBadge status={session.status} />
                    </li>
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
