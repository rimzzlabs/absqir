import { formatRange } from "@absqir/core/date";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Badge } from "@absqir/ui/badge";
import { A } from "@mobily/ts-belt";
import { match, P } from "ts-pattern";
import { EventActions } from "@/components/events/event-actions";
import { EventAttendance } from "@/components/events/event-attendance";
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton";
import { EventGuide } from "@/components/events/event-guide";
import { EventRecords } from "@/components/events/event-records";
import { PublicLink } from "@/components/events/public-link";
import { Providers } from "@/components/providers";
import { BackLink } from "@/components/shared/back-link";
import { QueryError } from "@/components/shared/query-error";
import type { RoleName } from "@/components/shared/role-badge";
import { EventStatusBadge } from "@/components/shared/status-badge";
import { useOrgHref } from "@/lib/org-path";
import { type Event, useEvent } from "@/queries/use-events";

export interface EventDetailProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
  eventId: string;
  role: RoleName;
}

/** What the event is: the name, when it runs, and who is on the list. */
function Header(props: { event: Event; role: RoleName }) {
  const { event } = props;
  const t = useTranslate();
  const orgHref = useOrgHref();
  const hasTags = event.groups.length > 0 || event.allowWalkIns;

  return (
    <header className="space-y-4">
      <BackLink href={orgHref("/events")}>{t("events:title")}</BackLink>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{event.title}</h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {formatRange(new Date(event.startsAt), new Date(event.endsAt))}
          </p>
          {match(hasTags)
            .with(false, () => null)
            .otherwise(() => (
              <div className="flex flex-wrap gap-1">
                {A.map(event.groups, (group) => (
                  <Badge key={group.id} variant="outline">
                    {group.name}
                  </Badge>
                ))}
                {match(event.allowWalkIns)
                  .with(true, () => <Badge variant="secondary">{t("events:detail.walkIns")}</Badge>)
                  .otherwise(() => null)}
              </div>
            ))}
          {match(event.description)
            .with(P.string.minLength(1), (description) => (
              <p className="text-muted-foreground max-w-prose text-sm">{description}</p>
            ))
            .otherwise(() => null)}
        </div>

        <EventActions event={event} role={props.role} />
      </div>
    </header>
  );
}

function EventDetailBody(props: EventDetailProps) {
  const event = useEvent(props.eventId);

  return match(event)
    .with({ isPending: true }, () => <EventDetailSkeleton />)
    .with({ isError: true }, () => <QueryError query={event} />)
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <div className="space-y-6">
        <Header event={data} role={props.role} />

        <EventGuide event={data} />

        {match(data.registrationOpen)
          .with(true, () => <PublicLink event={data} />)
          .otherwise(() => null)}

        <EventAttendance event={data} />

        <EventRecords event={data} />
      </div>
    ))
    .otherwise(() => null);
}

export function EventDetail(props: EventDetailProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <EventDetailBody {...props} />
    </Providers>
  );
}
