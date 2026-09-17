import { useTranslate } from "@absqir/i18n/react";
import { Alert, AlertDescription, AlertTitle } from "@absqir/ui/alert";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { cn } from "@absqir/ui/lib/utils";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { MagnifyingGlassIcon, UsersThreeIcon, WarningIcon } from "@phosphor-icons/react";
import { parseAsString, useQueryState } from "nuqs";
import { useDeferredValue } from "react";
import { match } from "ts-pattern";
import { EventRecordCard } from "@/components/events/event-record-card";
import { EVERY_STATUS, EventRecordsToolbar } from "@/components/events/event-records-toolbar";
import { QueryError } from "@/components/shared/query-error";
import { type Event, type EventRecord, useEventRecords } from "@/queries/use-events";

export interface EventRecordsProps {
  event: Event;
}

const TEXT = parseAsString.withDefault("");
const LIST = "flex flex-col gap-2";

function RecordList(props: { event: Event; rows: readonly EventRecord[]; filtered: boolean }) {
  const t = useTranslate();

  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {match(props.filtered)
              .with(true, () => <MagnifyingGlassIcon />)
              .otherwise(() => (
                <UsersThreeIcon />
              ))}
          </EmptyMedia>
          <EmptyTitle>
            {match(props.filtered)
              .with(true, () => t("events:records.noMatch"))
              .otherwise(() => t("events:records.empty"))}
          </EmptyTitle>
          <EmptyDescription>
            {match(props.filtered)
              .with(true, () => t("events:records.noMatchHint"))
              .otherwise(() => t("events:records.emptyHint"))}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className={LIST} aria-label={t("events:records.listLabel")}>
      {A.map(props.rows, (row) => (
        <EventRecordCard key={row.personId} event={props.event} record={row} />
      ))}
    </ul>
  );
}

/**
 * Everyone this event expected, and everyone who turned up, as a list the
 * organizer can search. The head count comes from the event, which counts
 * the whole room: a page of rows could only ever count itself.
 */
export function EventRecords(props: EventRecordsProps) {
  const t = useTranslate();
  const [q, setQ] = useQueryState("who", TEXT.withOptions({ throttleMs: 300 }));
  const [status, setStatus] = useQueryState("status", TEXT);
  // The list follows the typing a beat behind, so every keystroke does not fetch.
  const wanted = useDeferredValue(q.trim());
  const records = useEventRecords(props.event.id, { q: wanted, status });
  const pages = records.data?.pages ?? [];
  const rows = A.flatMap(pages, (page) => page.items);
  const flagged = A.head(pages)?.flagged ?? 0;
  const filtered = wanted !== "" || status !== EVERY_STATUS;
  // A filter is loading over a list that is already on screen.
  const refiltering = records.isFetching && !records.isFetchingNextPage;

  return (
    <section aria-labelledby="records-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 id="records-heading" className="text-sm font-medium">
          {t("events:records.heading")}
        </h2>
        <span className="text-muted-foreground text-sm tabular-nums">
          {t("common:people", { count: props.event.counts.expected })}
        </span>
      </div>

      {/* A flag that nobody sees is a flag that does nothing. It counts the
          whole event, so a filter can never hide one. */}
      {match(flagged)
        .with(0, () => null)
        .otherwise((count) => (
          <Alert>
            <WarningIcon />
            <AlertTitle>{t("events:records.flagged", { count })}</AlertTitle>
            <AlertDescription>{t("events:records.flaggedHint")}</AlertDescription>
          </Alert>
        ))}

      {match(records)
        .with({ isPending: true }, () => (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-10 rounded-lg" />
            <div className={LIST}>
              {A.map([0, 1, 2, 3, 4], (key) => (
                <Skeleton key={key} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        ))
        .with({ isError: true }, () => <QueryError query={records} />)
        .otherwise(() => (
          <div className="space-y-3">
            <EventRecordsToolbar
              q={q}
              onQChange={(value) => void setQ(value)}
              status={status}
              onStatusChange={(value) => void setStatus(value || null)}
              filtered={filtered}
              onClear={() => {
                void setQ(null);
                void setStatus(null);
              }}
            />

            {/* The old list stays while a new filter loads, dimmed, so the
                page never blinks back to a skeleton under the organizer. */}
            <div
              aria-busy={refiltering}
              className={cn(
                "transition-opacity",
                match(refiltering)
                  .with(true, () => "opacity-60" as const)
                  .otherwise(() => "" as const),
              )}
            >
              <RecordList event={props.event} rows={rows} filtered={filtered} />
            </div>

            {match(records.hasNextPage)
              .with(true, () => (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    disabled={records.isFetchingNextPage}
                    onClick={() => void records.fetchNextPage()}
                  >
                    {match(records.isFetchingNextPage)
                      .with(true, () => t("common:actions.loading"))
                      .otherwise(() => t("events:records.loadMore"))}
                  </Button>
                </div>
              ))
              .otherwise(() => null)}
          </div>
        ))}
    </section>
  );
}
