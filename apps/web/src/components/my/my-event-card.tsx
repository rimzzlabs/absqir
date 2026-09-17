import { formatDate, formatRange } from "@absqir/core/date";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { ClockIcon, TicketIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { opensAtOf } from "@/components/my/opens-at";
import { DayBlock } from "@/components/shared/day-block";
import { EventGroups } from "@/components/shared/event-groups";
import { ListCard, ListCardTitle } from "@/components/shared/list-card";
import { AttendanceStatusBadge, EventStatusBadge } from "@/components/shared/status-badge";
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

/** One event that expects me, as a row in the list. A click opens the event. */
export function MyEventCard(props: MyEventCardProps) {
  const orgHref = useOrgHref();
  const { event } = props;
  const t = useTranslate();
  const startsAt = new Date(event.startsAt);
  const running = event.status === "running";

  return (
    <ListCard
      link
      className={match(running)
        .with(true, () => "ring-primary/50" as const)
        .otherwise(() => "" as const)}
    >
      <DayBlock at={startsAt} active={running} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <ListCardTitle
          href={orgHref(`/events/${event.id}`)}
          title={event.title}
          aside={<EventStatusBadge status={event.status} />}
        />

        <p className="text-muted-foreground text-xs tabular-nums">
          {formatRange(startsAt, new Date(event.endsAt))}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-0.5">
          <EventGroups groups={event.groups} fallback={t("my:events.registered")} />

          {/* The pass button sits above the stretched link, or the link
              swallows the press. */}
          <div className="relative z-10 ml-auto">
            <Outcome {...props} />
          </div>
        </div>
      </div>
    </ListCard>
  );
}
