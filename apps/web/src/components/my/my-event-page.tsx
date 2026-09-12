import { formatDate, formatRange, isSameDay } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button, buttonVariants } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Separator } from "@absqir/ui/separator";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { NotePencilIcon, ScanIcon, TicketIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { AskLeaveDialog } from "@/components/my/ask-leave-dialog";
import { opensAtOf } from "@/components/my/opens-at";
import { PassDialog } from "@/components/my/pass-dialog";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import {
  AttendanceStatusBadge,
  EventStatusBadge,
  LeaveStatusBadge,
} from "@/components/shared/status-badge";
import { useWithdrawLeave } from "@/mutations/use-withdraw-leave";
import { type MyEventDetail, useMyEvent } from "@/queries/use-my";

export interface MyEventPageProps {
  eventId: string;
}

/** A time on the event's own day reads as a clock, elsewhere with the day. */
function timeNear(value: Date, day: Date): string {
  return isSameDay(value, day) ? formatDate(value, "time") : formatDate(value, "weekdayDateTime");
}

function Header(props: { event: MyEventDetail }) {
  const { event } = props;
  const startsAt = new Date(event.startsAt);
  const lateAt = new Date(startsAt.getTime() + event.lateAfterMinutes * 60_000);

  return (
    <header className="space-y-4">
      <a href="/my/events" className="text-muted-foreground hover:text-foreground text-sm">
        ← My events
      </a>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{event.title}</h1>
          <EventStatusBadge status={event.status} />
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {formatRange(startsAt, new Date(event.endsAt))}
        </p>
        <p className="text-muted-foreground mt-1 text-sm tabular-nums">
          {event.status === "done" ? null : (
            <>Door opens {timeNear(opensAtOf(event), startsAt)} · </>
          )}
          late after {timeNear(lateAt, startsAt)}
        </p>

        {event.groups.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {A.map(event.groups, (group) => (
              <Badge key={group.id} variant="outline">
                {group.name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground mt-2 flex items-center gap-1 text-sm">
            <UsersThreeIcon aria-hidden />
            You registered for this one.
          </p>
        )}

        {event.description ? (
          <p className="text-muted-foreground mt-3 max-w-prose text-sm">{event.description}</p>
        ) : null}
      </div>
    </header>
  );
}

/** My record, my request, or nothing yet, with what I can still do about it. */
function MySide(props: {
  event: MyEventDetail;
  onPass: () => void;
  onAskLeave: () => void;
  className?: string;
}) {
  const { event } = props;
  const withdraw = useWithdrawLeave();
  const running = event.status === "running";
  const canAsk = event.status !== "done" && !event.record && !event.leave;

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle>You</CardTitle>
        <CardDescription>
          {event.record ? "Your record for this event." : "Nothing on the register yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.record ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AttendanceStatusBadge status={event.record.status} />
              {event.record.checkedInAt ? (
                <span className="text-muted-foreground text-sm tabular-nums">
                  at {formatDate(new Date(event.record.checkedInAt), "time")}
                </span>
              ) : null}
            </div>
            {event.record.note ? (
              <p className="text-muted-foreground border-border border-l-2 pl-3 text-sm">
                {event.record.note}
              </p>
            ) : null}
          </div>
        ) : null}

        {event.leave ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Leave</span>
              <LeaveStatusBadge status={event.leave.status} />
            </div>
            <p className="text-sm">{event.leave.reason}</p>
            {event.leave.decisionNote ? (
              <p className="text-muted-foreground border-border border-l-2 pl-3 text-sm">
                {event.leave.decisionNote}
              </p>
            ) : null}
            {event.leave.status === "pending" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={withdraw.isPending}
                onClick={() => event.leave && withdraw.mutate(event.leave.id)}
              >
                {withdraw.isPending ? "Withdrawing…" : "Withdraw"}
              </Button>
            ) : null}
            <FormError error={withdraw.error} />
          </div>
        ) : null}

        {!event.record && !event.leave && !running ? (
          <p className="text-muted-foreground text-sm">
            {event.status === "done" ? "No record for you." : "Check in when the door opens."}
          </p>
        ) : null}

        {running || canAsk ? (
          <div className="flex flex-wrap gap-2">
            {running && !event.record ? (
              <>
                <a href="/check-in" className={buttonVariants({ size: "sm" })}>
                  <ScanIcon />
                  Check in
                </a>
                <Button size="sm" variant="outline" onClick={props.onPass}>
                  <TicketIcon />
                  My pass
                </Button>
              </>
            ) : null}
            {canAsk ? (
              <Button size="sm" variant={running ? "ghost" : "outline"} onClick={props.onAskLeave}>
                <NotePencilIcon />
                Ask for leave
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Who else is expected. Names and one head count, nothing per person. */
function Roster(props: { event: MyEventDetail; className?: string }) {
  const { event } = props;
  const hidden = event.expectedTotal - event.attendees.length;
  const headcount =
    event.status === "scheduled"
      ? `${event.expectedTotal} expected`
      : `${event.checkedInCount} of ${event.expectedTotal} checked in`;

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersThreeIcon />
          Who is expected
        </CardTitle>
        <CardDescription>{headcount}</CardDescription>
      </CardHeader>
      <CardContent>
        {event.attendees.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nobody else is on the list.</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {A.map(event.attendees, (person) => (
                <li key={person.id} className="min-w-0 truncate">
                  {person.name}
                </li>
              ))}
            </ul>
            {hidden > 0 ? (
              <>
                <Separator className="my-3" />
                <p className="text-muted-foreground text-sm">and {hidden} more</p>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MyEventBody(props: MyEventPageProps) {
  const event = useMyEvent(props.eventId);
  const [showPass, setShowPass] = useState(false);
  const [asking, setAsking] = useState(false);

  return match(event)
    .with({ isPending: true }, () => (
      <div className="space-y-6" aria-busy>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    ))
    .with({ isError: true, error: P.select() }, (error) => (
      <div className="space-y-4">
        <a href="/my/events" className="text-muted-foreground hover:text-foreground text-sm">
          ← My events
        </a>
        <FormError error={error} />
        <p className="text-muted-foreground text-sm">
          An event you are not expected at does not show up here.
        </p>
      </div>
    ))
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <>
        <Header event={data} />

        {/* On a phone my own standing comes first. On a wide screen it sits
            beside the roster, which takes the room it needs. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <MySide
            event={data}
            onPass={() => setShowPass(true)}
            onAskLeave={() => setAsking(true)}
            className="lg:order-2"
          />
          <Roster event={data} className="lg:order-1" />
        </div>

        <PassDialog eventId={showPass ? data.id : null} onClose={() => setShowPass(false)} />
        <AskLeaveDialog open={asking} onOpenChange={setAsking} event={data} />
      </>
    ))
    .otherwise(() => null);
}

/** One event, as the member who is expected at it reads it. */
export function MyEventPage(props: MyEventPageProps) {
  return (
    <Providers>
      <MyEventBody {...props} />
    </Providers>
  );
}
