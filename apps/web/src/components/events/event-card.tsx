import { formatDate } from "@absqir/core/date";
import { useTranslate } from "@absqir/i18n/react";
import { Badge } from "@absqir/ui/badge";
import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { CaretRightIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";
import { EventStatusBadge } from "@/components/shared/status-badge";
import { STRETCHED_LINK } from "@/components/shared/stretched-link";
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

/** The day, as a block the reader scans down the list without reading. */
function DayBlock(props: { at: Date }) {
  return (
    <div className="bg-muted/50 flex w-13 max-h-max shrink-0 flex-col items-center rounded-lg px-1 py-1.5">
      <span className="text-muted-foreground text-[0.625rem] leading-none tracking-wide uppercase">
        {formatDate(props.at, "month")}
      </span>
      <span className="mt-0.5 text-xl leading-none font-semibold tabular-nums">
        {formatDate(props.at, "dayOfMonth")}
      </span>
      <span className="text-muted-foreground mt-1 text-[0.625rem] leading-none">
        {formatDate(props.at, "weekday")}
      </span>
    </div>
  );
}

/** One event as a row in the list. The whole row is the link. */
export function EventCard(props: { event: Event }) {
  const orgHref = useOrgHref();
  const { event } = props;
  const t = useTranslate();
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const sameDay = formatDate(startsAt, "iso") === formatDate(endsAt, "iso");

  return (
    <li className="bg-card text-card-foreground ring-foreground/10 hover:ring-primary/40 relative isolate flex gap-3 rounded-xl p-3 ring-1 transition-shadow sm:gap-4 sm:p-4">
      <DayBlock at={startsAt} />

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
          {t("events:card.to", {
            start: formatDate(startsAt, "time"),
            end: match(sameDay)
              .with(true, () => formatDate(endsAt, "time"))
              .otherwise(() => formatDate(endsAt, "weekdayDateTime")),
          })}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          <Counts event={event} />

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
        </div>
      </div>

      <CaretRightIcon aria-hidden className="text-muted-foreground mt-0.5 shrink-0 self-center" />
    </li>
  );
}
