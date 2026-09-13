import { formatDate, formatRange, isSameDay, relativeToNow } from "@absqir/core/date";
import { Avatar, AvatarFallback } from "@absqir/ui/avatar";
import { Badge } from "@absqir/ui/badge";
import { Button, buttonVariants } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { cn } from "@absqir/ui/lib/utils";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import {
  CalendarBlankIcon,
  NotePencilIcon,
  ScanIcon,
  TicketIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { match, P } from "ts-pattern";
import { AskLeaveDialog } from "@/components/my/ask-leave-dialog";
import { opensAtOf } from "@/components/my/opens-at";
import { PassDialog } from "@/components/my/pass-dialog";
import { Providers } from "@/components/providers";
import { BackLink } from "@/components/shared/back-link";
import { FormError } from "@/components/shared/form-error";
import {
  AttendanceStatusBadge,
  EventStatusBadge,
  LeaveStatusBadge,
} from "@/components/shared/status-badge";
import { initialsOf } from "@/lib/avatar";
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

/**
 * The clock the timeline reads. The event query refetches every 30 seconds,
 * so the two stay roughly in step and "late after" never sits in the future
 * long after it passed.
 */
function useNow(everyMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);

  return now;
}

function Header(props: { event: MyEventDetail }) {
  const { event } = props;

  return (
    <header className="space-y-4">
      <BackLink href="/my/events">My events</BackLink>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{event.title}</h1>
          <EventStatusBadge status={event.status} />
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {formatRange(new Date(event.startsAt), new Date(event.endsAt))}
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

interface Moment {
  key: string;
  label: string;
  at: Date;
}

/** The four times that decide what a member can do, in order. */
function momentsOf(event: MyEventDetail): Moment[] {
  const startsAt = new Date(event.startsAt);

  return [
    { key: "opens", label: "Door opens", at: opensAtOf(event) },
    { key: "starts", label: "Starts", at: startsAt },
    {
      key: "late",
      label: "Late after",
      at: new Date(startsAt.getTime() + event.lateAfterMinutes * 60_000),
    },
    { key: "ends", label: "Ends", at: new Date(event.endsAt) },
  ];
}

/**
 * When the door opens, when a check-in turns late, and when it all closes.
 * The old page squeezed the same facts into one grey line under the title.
 */
function Schedule(props: { event: MyEventDetail; className?: string }) {
  const now = useNow();
  const startsAt = new Date(props.event.startsAt);
  const moments = momentsOf(props.event);
  const next = A.find(moments, (moment) => moment.at.getTime() > now.getTime());

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarBlankIcon />
          Timeline
        </CardTitle>
        <CardDescription>
          {match(next)
            .with(P.nullish, () => "This event is over.")
            .otherwise((moment) => `${moment.label} ${relativeToNow(moment.at)}.`)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol>
          {A.map(moments, (moment) => {
            const passed = moment.at.getTime() <= now.getTime();
            const isNext = next?.key === moment.key;

            return (
              <li key={moment.key} className="group relative flex gap-3 pb-4 last:pb-0">
                <span
                  aria-hidden
                  className="bg-border absolute top-3.5 bottom-0 left-[3px] w-px group-last:hidden"
                />
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-[7px] shrink-0 rounded-full transition-colors",
                    match(passed)
                      .with(true, () => "bg-primary")
                      .otherwise(() => "bg-muted-foreground/30"),
                    match(isNext)
                      .with(true, () => "ring-primary/30 bg-primary ring-4")
                      .otherwise(() => ""),
                  )}
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                  <span
                    className={cn(
                      "text-sm",
                      match(passed)
                        .with(true, () => "text-muted-foreground")
                        .otherwise(() => "text-foreground font-medium"),
                    )}
                  >
                    {moment.label}
                  </span>
                  <span className="text-sm tabular-nums">{timeNear(moment.at, startsAt)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
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
                    <a href="/check-in" className={buttonVariants({ size: "lg" })}>
                      <ScanIcon />
                      Check in
                    </a>
                    <Button size="lg" variant="outline" onClick={props.onPass}>
                      <TicketIcon />
                      My pass
                    </Button>
                  </>
                ))
                .otherwise(() => null)}
              {match(canAsk)
                .with(true, () => (
                  <Button
                    size="lg"
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
  const checkedIn = match(event.expectedTotal)
    .with(0, () => 0 as const)
    .otherwise((total) => Math.round((event.checkedInCount / total) * 100));

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersThreeIcon />
          Who is expected
        </CardTitle>
        <CardDescription>
          {match(event.status)
            .with("scheduled", () => `${event.expectedTotal} expected`)
            .otherwise(() => `${event.checkedInCount} of ${event.expectedTotal} checked in`)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {match(event.status)
          .with("scheduled", () => null)
          .otherwise(() => (
            <div
              role="progressbar"
              aria-label="Checked in so far"
              aria-valuenow={event.checkedInCount}
              aria-valuemin={0}
              aria-valuemax={event.expectedTotal}
              className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
            >
              <span
                className="bg-primary block h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${checkedIn}%` }}
              />
            </div>
          ))}

        {match(event.attendees.length)
          .with(0, () => (
            <p className="text-muted-foreground text-sm">Nobody else is on the list.</p>
          ))
          .otherwise(() => (
            <ul className="space-y-2">
              {A.map(event.attendees, (person) => (
                <li key={person.id} className="flex min-w-0 items-center gap-2.5">
                  <Avatar size="sm">
                    <AvatarFallback name={person.name}>{initialsOf(person.name)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">{person.name}</span>
                </li>
              ))}
            </ul>
          ))}

        {match(hidden > 0)
          .with(true, () => <p className="text-muted-foreground text-sm">and {hidden} more</p>)
          .otherwise(() => null)}

        <p className="text-muted-foreground border-t pt-3 text-xs">
          Only the head count is shared. Who checked in stays between them and the organizer.
        </p>
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
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    ))
    .with({ isError: true, error: P.select() }, (error) => (
      <div className="space-y-4">
        <BackLink href="/my/events">My events</BackLink>
        <FormError error={error} />
        <p className="text-muted-foreground text-sm">
          An event you are not expected at does not show up here.
        </p>
      </div>
    ))
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <>
        <Header event={data} />

        {/* My own standing comes first on a phone. The three cards sit side
            by side once there is room, so the page fills instead of leaving
            half of it blank. */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MySide
            event={data}
            onPass={() => setShowPass(true)}
            onAskLeave={() => setAsking(true)}
          />
          <Schedule event={data} />
          <Roster event={data} className="md:col-span-2 lg:col-span-1" />
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
