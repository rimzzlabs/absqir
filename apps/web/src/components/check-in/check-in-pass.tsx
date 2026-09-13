import { formatDate, formatRange, relativeToNow } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button, buttonVariants } from "@absqir/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@absqir/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { CalendarBlankIcon, CaretRightIcon, ClockIcon, TicketIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { opensAtOf } from "@/components/my/opens-at";
import { FormError } from "@/components/shared/form-error";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import type { MyEvent } from "@/queries/use-my";

export interface CheckInPassProps {
  events: readonly MyEvent[];
  pending: boolean;
  error: Error | null;
  onPass: (id: string) => void;
}

/** One event that accepts a pass right now. */
function RunningRow(props: { event: MyEvent; onPass: (id: string) => void }) {
  const { event } = props;

  return (
    <li className="ring-primary/40 bg-primary/5 flex flex-col gap-3 rounded-lg p-3 ring-1">
      <div className="min-w-0">
        <p className="text-sm leading-snug font-medium">{event.title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
          Runs until {formatDate(new Date(event.endsAt), "time")}
        </p>
      </div>

      {match(event.groups.length > 0)
        .with(true, () => (
          <div className="flex flex-wrap gap-1">
            {A.map(event.groups, (group) => (
              <Badge key={group.id} variant="outline">
                {group.name}
              </Badge>
            ))}
          </div>
        ))
        .otherwise(() => null)}

      {match(event.record)
        .with(P.nullish, () => (
          <Button size="sm" className="w-fit" onClick={() => props.onPass(event.id)}>
            <TicketIcon />
            My pass
          </Button>
        ))
        .otherwise((record) => (
          <div className="flex items-center gap-2">
            <AttendanceStatusBadge status={record.status} />
            {match(record.checkedInAt)
              .with(P.string.minLength(1), (checkedInAt) => (
                <span className="text-muted-foreground text-xs tabular-nums">
                  at {formatDate(new Date(checkedInAt), "time")}
                </span>
              ))
              .otherwise(() => null)}
          </div>
        ))}
    </li>
  );
}

/** The event the reader waits for, and the minute its door opens. */
function NextBlock(props: { event: MyEvent }) {
  const opensAt = opensAtOf(props.event);

  return (
    <div className="border-border rounded-lg border border-dashed p-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
        Up next
      </p>
      <p className="mt-1 text-sm leading-snug font-medium">{props.event.title}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        {formatRange(new Date(props.event.startsAt), new Date(props.event.endsAt))}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium">
        <ClockIcon aria-hidden className="shrink-0" />
        Check-in opens {formatDate(opensAt, "weekdayDateTime")}
        <span className="text-muted-foreground font-normal">({relativeToNow(opensAt)})</span>
      </p>
    </div>
  );
}

/**
 * The other way in. The organizer scans the reader, so this card carries the
 * pass, and says when the next door opens while nothing runs.
 */
export function CheckInPass(props: CheckInPassProps) {
  const running = A.filter(props.events, (row) => row.status === "running");
  const next = A.getBy(props.events, (row) => row.status === "scheduled");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketIcon />
          Show my pass
        </CardTitle>
        <CardDescription>
          When the organizer scans instead of the room screen, hold this up. One pass per event.
        </CardDescription>
        <CardAction>
          <a href="/my/events" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            My events
            <CaretRightIcon />
          </a>
        </CardAction>
      </CardHeader>

      <CardContent>
        {match(props)
          .with({ pending: true }, () => (
            <div className="flex flex-col gap-2" aria-busy>
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ))
          .with({ error: P.select(P.nonNullable) }, (error) => <FormError error={error} />)
          .otherwise(() => {
            if (running.length === 0 && !next) {
              return (
                <Empty className="py-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CalendarBlankIcon />
                    </EmptyMedia>
                    <EmptyTitle>Nothing expects you yet</EmptyTitle>
                    <EmptyDescription>
                      Events appear here once an organizer plans one for a group you belong to.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              );
            }

            return (
              <div className="flex flex-col gap-3">
                {match(running.length > 0)
                  .with(true, () => (
                    <ul className="flex flex-col gap-2">
                      {A.map(running, (event) => (
                        <RunningRow key={event.id} event={event} onPass={props.onPass} />
                      ))}
                    </ul>
                  ))
                  .otherwise(() => (
                    <p className="text-muted-foreground text-sm">
                      Nothing runs right now, so no pass works yet.
                    </p>
                  ))}

                {match(next)
                  .with(P.nullish, () => null)
                  .otherwise((next) => (
                    <NextBlock event={next} />
                  ))}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
