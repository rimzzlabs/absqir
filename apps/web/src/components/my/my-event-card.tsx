import { formatDate } from "@absqir/core/date";
import { useTranslate } from "@absqir/i18n/react";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { ClockIcon, TicketIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { opensAtOf } from "@/components/my/opens-at";
import { AttendanceStatusBadge, EventStatusBadge } from "@/components/shared/status-badge";
import { STRETCHED_LINK } from "@/components/shared/stretched-link";
import { useOrgHref } from "@/lib/org-path";
import type { MyEvent } from "@/queries/use-my";

export interface MyEventCardProps {
  event: MyEvent;
  onPass: (id: string) => void;
}

/** What the row ends with: my record, my pass, or when the door opens. */
function Outcome(props: MyEventCardProps) {
  const { event } = props;
  const t = useTranslate();

  if (event.record) {
    return (
      <div className="flex items-center gap-2">
        <AttendanceStatusBadge status={event.record.status} />
        {match(event.record.checkedInAt)
          .with(P.string.minLength(1), (checkedInAt) => (
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatDate(new Date(checkedInAt), "time")}
            </span>
          ))
          .otherwise(() => null)}
      </div>
    );
  }

  if (event.status === "running") {
    return (
      <Button size="sm" onClick={() => props.onPass(event.id)}>
        <TicketIcon />
        {t("my:events.myPass")}
      </Button>
    );
  }

  if (event.status === "scheduled") {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <ClockIcon aria-hidden />
        {t("my:events.opens", { when: formatDate(opensAtOf(event), "weekdayDateTime") })}
      </span>
    );
  }

  return <AttendanceStatusBadge status={null} />;
}

/** The day, as a block the reader scans down the list without reading. */
function DayBlock(props: { at: Date; running: boolean }) {
  return (
    <div
      className={cn(
        "flex w-13 shrink-0 flex-col items-center rounded-lg px-1 py-1.5",
        match(props.running)
          .with(true, () => "bg-primary/10 text-primary" as const)
          .otherwise(() => "bg-muted/50" as const),
      )}
    >
      <span className="text-[0.625rem] leading-none tracking-wide uppercase opacity-70">
        {formatDate(props.at, "month")}
      </span>
      <span className="mt-0.5 text-xl leading-none font-semibold tabular-nums">
        {formatDate(props.at, "dayOfMonth")}
      </span>
      <span className="mt-1 text-[0.625rem] leading-none opacity-70">
        {formatDate(props.at, "weekday")}
      </span>
    </div>
  );
}

/** One event that expects me, as a row in the list. A click opens the event. */
export function MyEventCard(props: MyEventCardProps) {
  const orgHref = useOrgHref();
  const { event } = props;
  const t = useTranslate();
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const sameDay = formatDate(startsAt, "iso") === formatDate(endsAt, "iso");
  const running = event.status === "running";

  return (
    <li
      className={cn(
        "bg-card text-card-foreground hover:bg-accent/40 relative isolate flex min-w-0 gap-3 rounded-xl p-3 ring-1 transition-[box-shadow,background-color] sm:gap-4 sm:p-4",
        match(running)
          .with(true, () => "ring-primary/50" as const)
          .otherwise(() => "ring-foreground/10" as const),
      )}
    >
      <DayBlock at={startsAt} running={running} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <a
            href={orgHref(`/events/${event.id}`)}
            className={cn(STRETCHED_LINK, "line-clamp-2 text-sm leading-snug font-medium")}
          >
            {event.title}
          </a>
          <span className="shrink-0">
            <EventStatusBadge status={event.status} />
          </span>
        </div>

        <p className="text-muted-foreground text-xs tabular-nums">
          {formatDate(startsAt, "weekdayDate")} ·{" "}
          {t("my:events.to", {
            start: formatDate(startsAt, "time"),
            end: match(sameDay)
              .with(true, () => formatDate(endsAt, "time"))
              .otherwise(() => formatDate(endsAt, "weekdayDateTime")),
          })}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-0.5">
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
            .otherwise(() => (
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <UsersThreeIcon aria-hidden />
                {t("my:events.registered")}
              </p>
            ))}

          {/* The pass button sits above the stretched link, or the link
              swallows the press. */}
          <div className="relative z-10 ml-auto">
            <Outcome {...props} />
          </div>
        </div>
      </div>
    </li>
  );
}
