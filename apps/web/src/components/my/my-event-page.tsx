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
  return match(isSameDay(value, day))
    .with(true, () => formatDate(value, "time"))
    .otherwise(() => formatDate(value, "weekdayDateTime"));
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
          {match(event.status)
            .with("done", () => null)
            .otherwise(() => (
              <>Door opens {timeNear(opensAtOf(event), startsAt)} · </>
            ))}
          late after {timeNear(lateAt, startsAt)}
        </p>

        {match(event.groups.length > 0)
          .with(true, () => (
            <div className="mt-2 flex flex-wrap gap-1">
              {A.map(event.groups, (group) => (
                <Badge key={group.id} variant="outline">
                  {group.name}
                </Badge>
              ))}
            </div>
          ))
          .otherwise(() => (
            <p className="text-muted-foreground mt-2 flex items-center gap-1 text-sm">
              <UsersThreeIcon aria-hidden />
              You registered for this one.
            </p>
          ))}

        {match(event.description)
          .with(P.string.minLength(1), (description) => (
            <p className="text-muted-foreground mt-3 max-w-prose text-sm">{description}</p>
          ))
          .otherwise(() => null)}
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
          {match(event.record)
            .with(P.nullish, () => "Nothing on the register yet." as const)
            .otherwise(() => "Your record for this event.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {match(event.record)
          .with(P.nullish, () => null)
          .otherwise((record) => (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AttendanceStatusBadge status={record.status} />
                {match(record.checkedInAt)
                  .with(P.string.minLength(1), (checkedInAt) => (
                    <span className="text-muted-foreground text-sm tabular-nums">
                      at {formatDate(new Date(checkedInAt), "time")}
                    </span>
                  ))
                  .otherwise(() => null)}
              </div>
              {match(record.note)
                .with(P.string.minLength(1), (note) => (
                  <p className="text-muted-foreground border-border border-l-2 pl-3 text-sm">
                    {note}
                  </p>
                ))
                .otherwise(() => null)}
            </div>
          ))}

        {match(event.leave)
          .with(P.nullish, () => null)
          .otherwise((leave) => (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Leave</span>
                <LeaveStatusBadge status={leave.status} />
              </div>
              <p className="text-sm">{leave.reason}</p>
              {match(leave.decisionNote)
                .with(P.string.minLength(1), (decisionNote) => (
                  <p className="text-muted-foreground border-border border-l-2 pl-3 text-sm">
                    {decisionNote}
                  </p>
                ))
                .otherwise(() => null)}
              {match(leave.status)
                .with("pending", () => (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={withdraw.isPending}
                    onClick={() => leave && withdraw.mutate(leave.id)}
                  >
                    {match(withdraw.isPending)
                      .with(true, () => "Withdrawing…" as const)
                      .otherwise(() => "Withdraw" as const)}
                  </Button>
                ))
                .otherwise(() => null)}
              <FormError error={withdraw.error} />
            </div>
          ))}

        {match(!event.record && !event.leave && !running)
          .with(true, () => (
            <p className="text-muted-foreground text-sm">
              {match(event.status)
                .with("done", () => "No record for you." as const)
                .otherwise(() => "Check in when the door opens." as const)}
            </p>
          ))
          .otherwise(() => null)}

        {match(running || canAsk)
          .with(true, () => (
            <div className="flex flex-wrap gap-2">
              {match(running && !event.record)
                .with(true, () => (
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
                ))
                .otherwise(() => null)}
              {match(canAsk)
                .with(true, () => (
                  <Button
                    size="sm"
                    variant={match(running)
                      .with(true, () => "ghost" as const)
                      .otherwise(() => "outline" as const)}
                    onClick={props.onAskLeave}
                  >
                    <NotePencilIcon />
                    Ask for leave
                  </Button>
                ))
                .otherwise(() => null)}
            </div>
          ))
          .otherwise(() => null)}
      </CardContent>
    </Card>
  );
}

/** Who else is expected. Names and one head count, nothing per person. */
function Roster(props: { event: MyEventDetail; className?: string }) {
  const { event } = props;
  const hidden = event.expectedTotal - event.attendees.length;
  const headcount = match(event.status)
    .with("scheduled", () => `${event.expectedTotal} expected`)
    .otherwise(() => `${event.checkedInCount} of ${event.expectedTotal} checked in`);

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
        {match(event.attendees.length)
          .with(0, () => (
            <p className="text-muted-foreground text-sm">Nobody else is on the list.</p>
          ))
          .otherwise(() => (
            <>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {A.map(event.attendees, (person) => (
                  <li key={person.id} className="min-w-0 truncate">
                    {person.name}
                  </li>
                ))}
              </ul>
              {match(hidden > 0)
                .with(true, () => (
                  <>
                    <Separator className="my-3" />
                    <p className="text-muted-foreground text-sm">and {hidden} more</p>
                  </>
                ))
                .otherwise(() => null)}
            </>
          ))}
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

        <PassDialog
          eventId={match(showPass)
            .with(true, () => data.id)
            .otherwise(() => null)}
          onClose={() => setShowPass(false)}
        />
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
