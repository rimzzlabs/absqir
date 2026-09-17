import { formatRange } from "@absqir/core/date";
import { useTranslate } from "@absqir/i18n/react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";
import { DayBlock } from "@/components/shared/day-block";
import { EventGroups } from "@/components/shared/event-groups";
import { ListCard, ListCardTitle } from "@/components/shared/list-card";
import { EventStatusBadge } from "@/components/shared/status-badge";
import { useOrgHref } from "@/lib/org-path";
import type { Event } from "@/queries/use-events";

function Counts(props: { event: Event }) {
  const { counts, status } = props.event;
  const t = useTranslate();
  const checkedIn = counts.present + counts.late;

  if (status === "scheduled") {
    return (
      <span className="text-muted-foreground text-xs tabular-nums">
        {t("events:card.expected", { count: counts.expected })}
      </span>
    );
  }

  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {t("events:card.checkedIn", {
        checkedIn,
        expected: counts.expected,
      })}
      {match(counts.late > 0)
        .with(true, () => t("events:card.late", { count: counts.late }))
        .otherwise(() => "" as const)}
      {match(status === "done" && counts.absent > 0)
        .with(true, () => t("events:card.absent", { count: counts.absent }))
        .otherwise(() => "" as const)}
    </span>
  );
}

/** One event as a row in the list. The whole row is the link. */
export function EventCard(props: { event: Event }) {
  const orgHref = useOrgHref();
  const { event } = props;
  const t = useTranslate();
  const startsAt = new Date(event.startsAt);

  return (
    <ListCard link>
      <DayBlock at={startsAt} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <ListCardTitle
          href={orgHref(`/events/${event.id}`)}
          title={event.title}
          aside={<EventStatusBadge status={event.status} />}
        />

        <p className="text-muted-foreground text-xs tabular-nums">
          {formatRange(startsAt, new Date(event.endsAt))}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          <Counts event={event} />
          <EventGroups groups={event.groups} fallback={t("events:card.noGroup")} />
        </div>
      </div>

      <CaretRightIcon aria-hidden className="text-muted-foreground mt-0.5 shrink-0 self-center" />
    </ListCard>
  );
}
