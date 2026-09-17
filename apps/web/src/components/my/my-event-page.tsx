import { formatDate, formatRange, isSameDay, relativeToNow } from "@absqir/core/date";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
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
import { cn } from "@absqir/ui/lib/utils";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import {
  CalendarBlankIcon,
  MapPinIcon,
  NotePencilIcon,
  ScanIcon,
  TicketIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { match, P } from "ts-pattern";
import { AskLeaveDialog } from "@/components/my/ask-leave-dialog";
import { MyEventRoster } from "@/components/my/my-event-roster";
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
import { useOrgHref } from "@/lib/org-path";
import { useWithdrawLeave } from "@/mutations/use-withdraw-leave";
import { type MyEventDetail, useMyEvent } from "@/queries/use-my";

export interface MyEventPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
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
  const t = useTranslate();
  const orgHref = useOrgHref();

  return (
    <header className="space-y-4">
      <BackLink href={orgHref("/my/events")}>{t("my:event.back")}</BackLink>

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
              {t("my:event.registeredNote")}
            </p>
          ))}

        {/* A member who learns about the fence only by being refused at the
            door has been told too late. */}
        {match(event.fence)
          .with(P.nonNullable, (fence) => (
            <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-sm">
              <MapPinIcon aria-hidden className="mt-0.5 shrink-0" />
              <span>
                {fence.name ?? t("my:event.somePlace")}
                {match(event.requireLocation)
                  .with(true, () => t("my:event.within", { radius: fence.radiusMeters }))
                  .otherwise(() => "")}
              </span>
            </p>
          ))
          .otherwise(() => null)}

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
  /** The key under `my:event.moments` that names it. */
  key: "opens" | "starts" | "late" | "ends";
  at: Date;
}

/** The four times that decide what a member can do, in order. */
function momentsOf(event: MyEventDetail): Moment[] {
  const startsAt = new Date(event.startsAt);

  return [
    { key: "opens", at: opensAtOf(event) },
    { key: "starts", at: startsAt },
    { key: "late", at: new Date(startsAt.getTime() + event.lateAfterMinutes * 60_000) },
    { key: "ends", at: new Date(event.endsAt) },
  ];
}

/**
 * When the door opens, when a check-in turns late, and when it all closes.
 * The old page squeezed the same facts into one grey line under the title.
 */
function Schedule(props: { event: MyEventDetail; className?: string }) {
  const t = useTranslate();
  const now = useNow();
  const startsAt = new Date(props.event.startsAt);
  const moments = momentsOf(props.event);
  const next = A.find(moments, (moment) => moment.at.getTime() > now.getTime());

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarBlankIcon />
          {t("my:event.timeline")}
        </CardTitle>
        <CardDescription>
          {match(next)
            .with(P.nullish, () => t("my:event.over"))
            .otherwise(() => t("my:event.timelineHint"))}
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
                    {t(`my:event.moments.${moment.key}`)}
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
  const t = useTranslate();
  const orgHref = useOrgHref();
  const withdraw = useWithdrawLeave();
  const now = useNow();
  const running = event.status === "running";
  const canAsk = event.status !== "done" && !event.record && !event.leave;
  const next = A.find(momentsOf(event), (moment) => moment.at.getTime() > now.getTime());

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle>{t("my:event.you")}</CardTitle>
        <CardDescription>
          {match(event.record)
            .with(P.nonNullable, () => t("my:event.yourRecord"))
            .otherwise(() =>
              match(event.status)
                .with("done", () => t("my:event.noRecord"))
                .otherwise(() => t("my:event.nothingRecorded")),
            )}
        </CardDescription>

        {/* What happens next, where the reader looks first. The timeline
            below holds the whole list; this is only the one that matters. */}
        {match(next)
          .with(P.nullish, () => null)
          .otherwise((moment) => (
            <CardAction className="text-right">
              <p className="text-sm font-medium">
                {t("my:event.next", {
                  moment: t(`my:event.moments.${moment.key}`),
                  when: relativeToNow(moment.at),
                })}
              </p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {timeNear(moment.at, new Date(event.startsAt))}
              </p>
            </CardAction>
          ))}
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
                      {t("my:event.at", { time: formatDate(new Date(checkedInAt), "time") })}
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
                <span className="text-muted-foreground text-sm">{t("my:event.leave")}</span>
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
                      .with(true, () => t("my:event.withdrawing"))
                      .otherwise(() => t("my:event.withdraw"))}
                  </Button>
                ))
                .otherwise(() => null)}
              <FormError error={withdraw.error} />
            </div>
          ))}

        {/* A member who reported a problem has to be able to see it landed,
            and what came of it. Otherwise they report again. */}
        {match(event.report)
          .with(P.nullish, () => null)
          .otherwise((report) => (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">{t("my:event.problem")}</span>
                {match(report.status)
                  .with("approved", () => (
                    <Badge variant="secondary">{t("my:event.accepted")}</Badge>
                  ))
                  .with("declined", () => (
                    <Badge variant="outline">{t("my:event.notAccepted")}</Badge>
                  ))
                  .otherwise(() => (
                    <Badge>{t("my:event.waiting")}</Badge>
                  ))}
              </div>
              <p className="text-sm">{report.message}</p>
              {match(report.decisionNote)
                .with(P.string.minLength(1), (decisionNote) => (
                  <p className="text-muted-foreground border-border border-l-2 pl-3 text-sm">
                    {decisionNote}
                  </p>
                ))
                .otherwise(() => null)}
            </div>
          ))}

        {match(!event.record && !event.leave && !running && event.status !== "done")
          .with(true, () => (
            <p className="text-muted-foreground text-sm">{t("my:event.checkInWhenOpen")}</p>
          ))
          .otherwise(() => null)}

        {match(running || canAsk)
          .with(true, () => (
            <div className="flex flex-wrap gap-2">
              {match(running && !event.record)
                .with(true, () => (
                  <>
                    <a href={orgHref("/check-in")} className={buttonVariants({ size: "lg" })}>
                      <ScanIcon />
                      {t("my:event.checkIn")}
                    </a>
                    <Button size="lg" variant="outline" onClick={props.onPass}>
                      <TicketIcon />
                      {t("my:event.myPass")}
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
                    {t("my:event.askLeave")}
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

function MyEventBody(props: MyEventPageProps) {
  const t = useTranslate();
  const orgHref = useOrgHref();
  const event = useMyEvent(props.eventId);
  const [showPass, setShowPass] = useState(false);
  const [asking, setAsking] = useState(false);

  return match(event)
    .with({ isPending: true }, () => (
      <div className="space-y-6" aria-busy>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    ))
    .with({ isError: true, error: P.select() }, (error) => (
      <div className="space-y-4">
        <BackLink href={orgHref("/my/events")}>{t("my:event.back")}</BackLink>
        <FormError error={error} />
        <p className="text-muted-foreground text-sm">{t("my:event.notExpected")}</p>
      </div>
    ))
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <>
        <Header event={data} />

        {/* What the reader can do comes first and takes the width, because
            it is the only part of the page they act on. The two panels that
            only tell them things sit under it, side by side. */}
        <div className="space-y-4">
          <MySide
            event={data}
            onPass={() => setShowPass(true)}
            onAskLeave={() => setAsking(true)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Schedule event={data} />
            <MyEventRoster event={data} />
          </div>
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
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <MyEventBody {...props} />
    </Providers>
  );
}
