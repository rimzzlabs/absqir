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
import { Skeleton } from "@absqir/ui/skeleton";
import { CaretRightIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { useMyHistory } from "@/queries/use-my";

/** Enough to prove the last scans worked, without a scroll. */
const RECENT = 4;

/** The last few records, so the reader can tell a scan really landed. */
export function CheckInRecent() {
  const history = useMyHistory();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockCounterClockwiseIcon />
          Your last check-ins
        </CardTitle>
        <CardDescription>Newest first.</CardDescription>
        <CardAction>
          <a href="/my/history" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            History
            <CaretRightIcon />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        {match(history)
          .with({ isPending: true }, () => (
            <div className="flex flex-col gap-2" aria-busy>
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} className="h-9 rounded-lg" />
              ))}
            </div>
          ))
          .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
          .with({ data: P.select(P.nonNullable) }, (rows) => {
            if (rows.length === 0) {
              return (
                <p className="text-muted-foreground text-sm">
                  No closed event has your name yet. Your first scan lands here.
                </p>
              );
            }

            return (
              <ul className="divide-border divide-y">
                {rows.slice(0, RECENT).map((row) => (
                  <li key={row.sessionId} className="flex items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{row.title}</span>
                      <span className="text-muted-foreground block text-xs tabular-nums">
                        {formatDate(new Date(row.startsAt), "weekdayDate")}
                        {row.checkedInAt
                          ? ` · in at ${formatDate(new Date(row.checkedInAt), "time")}`
                          : ""}
                      </span>
                    </span>
                    <AttendanceStatusBadge status={row.status} />
                  </li>
                ))}
              </ul>
            );
          })
          .otherwise(() => null)}
      </CardContent>
    </Card>
  );
}
