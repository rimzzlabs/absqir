import { formatDate } from "@absqir/core/date";
import { useTranslate } from "@absqir/i18n/react";
import { Badge } from "@absqir/ui/badge";
import { A } from "@mobily/ts-belt";
import { CaretRightIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";
import { EventStatusBadge } from "@/components/shared/status-badge";
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
        checkedIn: String(checkedIn),
        expected: String(counts.expected),
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

/** One event as a card. The whole card is the link. */
export function EventCard(props: { event: Event }) {
  const { event } = props;
  const t = useTranslate();
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const sameDay = formatDate(startsAt, "iso") === formatDate(endsAt, "iso");

  return (
    <li className="min-w-0">
      <a
        href={`/events/${event.id}`}
        className="bg-card text-card-foreground ring-foreground/10 hover:ring-primary/40 focus-visible:ring-ring flex h-full flex-col gap-3 rounded-xl p-4 ring-1 transition-[box-shadow] focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <EventStatusBadge status={event.status} />
          <span className="text-muted-foreground text-xs tabular-nums">
            {t("events:card.to", {
              start: formatDate(startsAt, "time"),
              end: match(sameDay)
                .with(true, () => formatDate(endsAt, "time"))
                .otherwise(() => formatDate(endsAt, "weekdayDateTime")),
            })}
          </span>
        </div>

        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{event.title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {formatDate(startsAt, "weekdayDate")}
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
          .otherwise(() => (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <UsersThreeIcon aria-hidden />
              {t("events:card.noGroup")}
            </p>
          ))}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <Counts event={event} />
          <CaretRightIcon aria-hidden className="text-muted-foreground" />
        </div>
      </a>
    </li>
  );
}
