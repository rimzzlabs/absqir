import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { A } from "@mobily/ts-belt";
import { PlusIcon, QrCodeIcon } from "@phosphor-icons/react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useDeferredValue, useState } from "react";
import { match, P } from "ts-pattern";
import { EventCard } from "@/components/events/event-card";
import { EventDialog } from "@/components/events/event-dialog";
import { EventsToolbar } from "@/components/events/events-toolbar";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";
import { type Event, type EventScope, useEvents } from "@/queries/use-events";

export interface EventsPageProps {
  role: RoleName;
}

/** The two tabs. The API also knows "all", which the list never asks for. */
type ListScope = Extract<EventScope, "upcoming" | "past">;

const SCOPE = parseAsStringLiteral(["upcoming", "past"] as const satisfies ListScope[]).withDefault(
  "upcoming",
);
const TEXT = parseAsString.withDefault("");

const GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

function EventGrid(props: { rows: readonly Event[]; scope: ListScope; filtered: boolean }) {
  const past = props.scope === "past";
  const emptyTitle = match(past)
    .with(true, () => "Nothing has happened yet" as const)
    .otherwise(() => "Nothing is planned" as const);
  const emptyHint = match(past)
    .with(true, () => "Closed events land here with their records." as const)
    .otherwise(() => "Create an event, or set up a schedule that creates them for you." as const);

  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <QrCodeIcon />
          </EmptyMedia>
          <EmptyTitle>
            {match(props.filtered)
              .with(true, () => "Nothing matches" as const)
              .otherwise(() => emptyTitle)}
          </EmptyTitle>
          <EmptyDescription>
            {match(props.filtered)
              .with(true, () => "Try another title, or every group." as const)
              .otherwise(() => emptyHint)}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className={GRID}>
      {A.map(props.rows, (event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </ul>
  );
}

function EventsBody(props: EventsPageProps) {
  const [scope, setScope] = useQueryState("scope", SCOPE);
  const [q, setQ] = useQueryState("q", TEXT.withOptions({ throttleMs: 300 }));
  const [groupId, setGroupId] = useQueryState("group", TEXT);
  // The grid follows the typing a beat behind, so every keystroke does not fetch.
  const wanted = useDeferredValue(q.trim());
  const events = useEvents({ scope, q: wanted, groupId });
  const rows = A.flatMap(events.data?.pages ?? [], (page) => page.items);
  const [creating, setCreating] = useState(false);
  const canCreate = props.role !== "member";

  return (
    <>
      <PageHeader
        title="Events"
        description="One event is one moment people are expected. It opens and closes on its own clock."
        actions={match(canCreate)
          .with(true, () => (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              New event
            </Button>
          ))
          .otherwise(() => null)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={scope} onValueChange={(value) => void setScope(value as ListScope)}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>

        <EventsToolbar
          q={q}
          onQChange={(value) => void setQ(value)}
          groupId={groupId}
          onGroupChange={(value) => void setGroupId(value)}
        />
      </div>

      {match(events)
        .with({ isPending: true }, () => (
          <div className={GRID} aria-busy>
            {A.map([0, 1, 2, 3], (key) => (
              <Skeleton key={key} className="h-44 rounded-xl" />
            ))}
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.nonNullable }, () => (
          <div className="space-y-4">
            <EventGrid rows={rows} scope={scope} filtered={wanted !== "" || groupId !== ""} />

            {match(events.hasNextPage)
              .with(true, () => (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    disabled={events.isFetchingNextPage}
                    onClick={() => void events.fetchNextPage()}
                  >
                    {match(events.isFetchingNextPage)
                      .with(true, () => "Loading…" as const)
                      .otherwise(() => "Load more" as const)}
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
    <Providers>
      <EventsBody {...props} />
    </Providers>
  );
}
