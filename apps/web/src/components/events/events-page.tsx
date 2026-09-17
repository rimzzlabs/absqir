import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { PlusIcon, QrCodeIcon } from "@phosphor-icons/react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useDeferredValue, useState } from "react";
import { match, P } from "ts-pattern";
import { EventCard } from "@/components/events/event-card";
import { EventDialog } from "@/components/events/event-dialog";
import { EventsToolbar } from "@/components/events/events-toolbar";
import { Providers } from "@/components/providers";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import type { RoleName } from "@/components/shared/role-badge";
import { type Event, type EventScope, useEvents } from "@/queries/use-events";

export interface EventsPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
  role: RoleName;
}

/** The two tabs. The API also knows "all", which the list never asks for. */
type ListScope = Extract<EventScope, "upcoming" | "past">;

const SCOPE = parseAsStringLiteral(["upcoming", "past"] as const satisfies ListScope[]).withDefault(
  "upcoming",
);
const TEXT = parseAsString.withDefault("");

const LIST = "flex flex-col gap-2";

function EventList(props: { rows: readonly Event[]; scope: ListScope; filtered: boolean }) {
  const t = useTranslate();
  const past = props.scope === "past";
  const emptyTitle = match(past)
    .with(true, () => t("events:empty.nothingPast"))
    .otherwise(() => t("events:empty.nothingPlanned"));
  const emptyHint = match(past)
    .with(true, () => t("events:empty.nothingPastHint"))
    .otherwise(() => t("events:empty.nothingPlannedHint"));

  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <QrCodeIcon />
          </EmptyMedia>
          <EmptyTitle>
            {match(props.filtered)
              .with(true, () => t("events:empty.noMatch"))
              .otherwise(() => emptyTitle)}
          </EmptyTitle>
          <EmptyDescription>
            {match(props.filtered)
              .with(true, () => t("events:empty.noMatchHint"))
              .otherwise(() => emptyHint)}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className={LIST}>
      {A.map(props.rows, (event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </ul>
  );
}

function EventsBody(props: EventsPageProps) {
  const t = useTranslate();
  const [scope, setScope] = useQueryState("scope", SCOPE);
  const [q, setQ] = useQueryState("q", TEXT.withOptions({ throttleMs: 300 }));
  const [groupId, setGroupId] = useQueryState("group", TEXT);
  // The list follows the typing a beat behind, so every keystroke does not fetch.
  const wanted = useDeferredValue(q.trim());
  const events = useEvents({ scope, q: wanted, groupId });
  const rows = A.flatMap(events.data?.pages ?? [], (page) => page.items);
  const filtered = wanted !== "" || groupId !== "";
  const [creating, setCreating] = useState(false);
  const canCreate = props.role !== "member";

  return (
    <>
      <PageHeader
        title={t("events:title")}
        description={t("events:description")}
        actions={match(canCreate)
          .with(true, () => (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              {t("events:new")}
            </Button>
          ))
          .otherwise(() => null)}
      />

      <EventsToolbar
        scope={scope}
        onScopeChange={(value) => void setScope(value as ListScope)}
        q={q}
        onQChange={(value) => void setQ(value)}
        groupId={groupId}
        onGroupChange={(value) => void setGroupId(value)}
        filtered={filtered}
        onClear={() => {
          void setQ(null);
          void setGroupId(null);
        }}
      />

      {match(events)
        .with({ isPending: true }, () => (
          <div className={LIST} aria-busy>
            {A.map([0, 1, 2, 3, 4], (key) => (
              <Skeleton key={key} className="h-24 rounded-xl" />
            ))}
          </div>
        ))
        .with({ isError: true }, () => <QueryError query={events} />)
        .with({ data: P.nonNullable }, () => (
          <div className="space-y-4">
            <EventList rows={rows} scope={scope} filtered={filtered} />

            {match(events.hasNextPage)
              .with(true, () => (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    disabled={events.isFetchingNextPage}
                    onClick={() => void events.fetchNextPage()}
                  >
                    {match(events.isFetchingNextPage)
                      .with(true, () => t("common:actions.loading"))
                      .otherwise(() => t("events:loadMore"))}
                  </Button>
                </div>
              ))
              .otherwise(() => null)}
          </div>
        ))
        .otherwise(() => null)}

      <EventDialog open={creating} onOpenChange={setCreating} event={null} />
    </>
  );
}

export function EventsPage(props: EventsPageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <EventsBody {...props} />
    </Providers>
  );
}
