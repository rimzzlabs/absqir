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
import { A, pipe } from "@mobily/ts-belt";
import { CaretRightIcon, ChartBarIcon } from "@phosphor-icons/react";
import { type AttendanceStatus, AttendanceStatusBadge } from "@/components/shared/status-badge";
import type { HistoryRow } from "@/queries/use-my";

export interface MemberHomeStandingProps {
  history: HistoryRow[];
}

/** The same hues as the status badges, so the bar reads like the labels. */
const SEGMENTS: { status: AttendanceStatus; label: string; className: string }[] = [
  { status: "present", label: "Present", className: "bg-emerald-500" },
  { status: "late", label: "Late", className: "bg-amber-500" },
  { status: "excused", label: "Excused", className: "bg-sky-500" },
  { status: "absent", label: "Absent", className: "bg-destructive" },
];

const RECENT = 5;

/** How it has gone: the rate, the split, and the last few records. */
export function MemberHomeStanding(props: MemberHomeStandingProps) {
  const total = props.history.length;
  const countNote = total === 1 ? "One closed event." : `${total} closed events.`;
  const counts = Object.fromEntries(
    A.map(SEGMENTS, (segment) => [
      segment.status,
      A.filter(props.history, (row) => row.status === segment.status).length,
    ]),
  ) as Record<AttendanceStatus, number>;
  // An excused event neither helps nor hurts.
  const judged = total - counts.excused;
  const rate = judged === 0 ? null : Math.round(((counts.present + counts.late) / judged) * 100);
  const recent = props.history.slice(0, RECENT);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBarIcon />
          Your standing
        </CardTitle>
        <CardDescription>
          {total === 0 ? "No closed event has your name yet." : countNote}
        </CardDescription>
        <CardAction>
          <a href="/my/history" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            History
            <CaretRightIcon />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">
            {rate === null ? "—" : `${rate}%`}
          </p>
          <p className="text-muted-foreground text-sm">
            Present or late, of the events that count.
          </p>
        </div>

        <div
          role="img"
          aria-label={A.map(
            SEGMENTS,
            (segment) => `${counts[segment.status]} ${segment.label}`,
          ).join(", ")}
          className="bg-muted flex h-2 w-full overflow-hidden rounded-full"
        >
          {total > 0
            ? pipe(
                SEGMENTS,
                A.filter((segment) => counts[segment.status] > 0),
                A.map((segment) => (
                  <span
                    key={segment.status}
                    className={segment.className}
                    style={{ width: `${(counts[segment.status] / total) * 100}%` }}
                  />
                )),
              )
            : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {A.map(SEGMENTS, (segment) => (
            <div key={segment.status} className="flex items-center gap-2">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", segment.className)} />
              <dt className="text-muted-foreground flex-1">{segment.label}</dt>
              <dd className="font-medium tabular-nums">{counts[segment.status]}</dd>
            </div>
          ))}
        </dl>

        {recent.length > 0 ? (
          <ul className="divide-border border-border divide-y border-t pt-1">
            {A.map(recent, (row) => (
              <li key={row.sessionId} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.title}</span>
                  <span className="text-muted-foreground block text-xs">
                    {formatDate(new Date(row.startsAt), "weekdayDateTime")}
                  </span>
                </span>
                <AttendanceStatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
