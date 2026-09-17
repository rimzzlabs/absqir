import { formatDate } from "@absqir/core/date";
import { formatNumber, formatPercent } from "@absqir/core/numbers";
import { useTranslate } from "@absqir/i18n/react";
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
import { match } from "ts-pattern";
import { type AttendanceStatus, AttendanceStatusBadge } from "@/components/shared/status-badge";
import { useOrgHref } from "@/lib/org-path";
import type { HistoryRow, HistorySummary } from "@/queries/use-my";

export interface MemberHomeStandingProps {
  /** The counts for every closed event, as the database counted them. */
  summary: HistorySummary;
  /** The last few records, newest first. */
  recent: readonly HistoryRow[];
}

/** The same hues as the status badges, so the bar reads like the labels. */
const SEGMENTS: { status: AttendanceStatus; className: string }[] = [
  { status: "present", className: "bg-emerald-500" },
  { status: "late", className: "bg-amber-500" },
  { status: "excused", className: "bg-sky-500" },
  { status: "absent", className: "bg-destructive" },
];

const RECENT = 5;

/** How it has gone: the rate, the split, and the last few records. */
export function MemberHomeStanding(props: MemberHomeStandingProps) {
  const t = useTranslate();
  const orgHref = useOrgHref();
  const total = props.summary.total;
  const countNote = t("home:member.closedEvents", { count: total });
  const counts = Object.fromEntries(
    A.map(SEGMENTS, (segment) => [segment.status, props.summary[segment.status]]),
  ) as Record<AttendanceStatus, number>;
  // An excused event neither helps nor hurts.
  const judged = total - counts.excused;
  const rate = match(judged)
    .with(0, () => null)
    .otherwise((judged) => (counts.present + counts.late) / judged);
  const recent = props.recent.slice(0, RECENT);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBarIcon />
          {t("home:member.standing")}
        </CardTitle>
        <CardDescription>
          {match(total)
            .with(0, () => t("home:member.standingEmpty"))
            .otherwise(() => countNote)}
        </CardDescription>
        <CardAction>
          <a
            href={orgHref("/my/history")}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t("home:member.history")}
            <CaretRightIcon />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">
            {formatPercent(rate)}
          </p>
          <p className="text-muted-foreground text-sm">{t("home:member.rateHint")}</p>
        </div>

        <div
          role="img"
          aria-label={A.map(
            SEGMENTS,
            (segment) => `${counts[segment.status]} ${t(`common:attendance.${segment.status}`)}`,
          ).join(", ")}
          className="bg-muted flex h-2 w-full overflow-hidden rounded-full"
        >
          {match(total > 0)
            .with(true, () =>
              pipe(
                SEGMENTS,
                A.filter((segment) => counts[segment.status] > 0),
                A.map((segment) => (
                  <span
                    key={segment.status}
                    className={segment.className}
                    style={{ width: `${(counts[segment.status] / total) * 100}%` }}
                  />
                )),
              ),
            )
            .otherwise(() => null)}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {A.map(SEGMENTS, (segment) => (
            <div key={segment.status} className="flex items-center gap-2">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", segment.className)} />
              <dt className="text-muted-foreground flex-1">
                {t(`common:attendance.${segment.status}`)}
              </dt>
              <dd className="font-medium tabular-nums">{formatNumber(counts[segment.status])}</dd>
            </div>
          ))}
        </dl>

        {match(recent.length > 0)
          .with(true, () => (
            <ul className="divide-border border-border divide-y border-t pt-1">
              {A.map(recent, (row) => (
                <li key={row.eventId} className="flex items-center gap-3 py-2 text-sm">
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
          ))
          .otherwise(() => null)}
      </CardContent>
    </Card>
  );
}
