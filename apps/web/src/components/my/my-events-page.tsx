import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { QrCodeIcon } from "@phosphor-icons/react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useDeferredValue, useState } from "react";
import { match, P } from "ts-pattern";
import { MyEventCard } from "@/components/my/my-event-card";
import { MyEventsToolbar } from "@/components/my/my-events-toolbar";
import { PassDialog } from "@/components/my/pass-dialog";
import { Providers } from "@/components/providers";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { type MyEvent, type MyEventScope, useMyEvents } from "@/queries/use-my";

const SCOPE = parseAsStringLiteral([
  "upcoming",
  "past",
] as const satisfies MyEventScope[]).withDefault("upcoming");
const TEXT = parseAsString.withDefault("");

const LIST = "flex flex-col gap-2";

function EventList(props: {
  rows: readonly MyEvent[];
  scope: MyEventScope;
  filtered: boolean;
  onPass: (id: string) => void;
}) {
  const t = useTranslate();

  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <QrCodeIcon />
          </EmptyMedia>
          <EmptyTitle>
            {match(props.filtered)
              .with(true, () => t("my:events.noMatch"))
              .otherwise(() =>
                match(props.scope)
                  .with("past", () => t("my:events.emptyPast"))
                  .otherwise(() => t("my:events.emptyUpcoming")),
              )}
          </EmptyTitle>
          <EmptyDescription>
            {match(props.filtered)
              .with(true, () => t("my:events.noMatchHint"))
              .otherwise(() =>
                match(props.scope)
                  .with("past", () => t("my:events.emptyPastHint"))
                  .otherwise(() => t("my:events.emptyUpcomingHint")),
              )}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className={LIST}>
      {A.map(props.rows, (event) => (
        <MyEventCard key={event.id} event={event} onPass={props.onPass} />
      ))}
    </ul>
  );
}

function MyEventsBody() {
  const t = useTranslate();
  const [scope, setScope] = useQueryState("scope", SCOPE);
  const [q, setQ] = useQueryState("q", TEXT.withOptions({ throttleMs: 300 }));
  // The list follows the typing a beat behind, so every keystroke does not fetch.
  const wanted = useDeferredValue(q.trim());
  const events = useMyEvents({ scope, q: wanted });
  const rows = A.flatMap(events.data?.pages ?? [], (page) => page.items);
  const filtered = wanted !== "";
  const [passFor, setPassFor] = useState<string | null>(null);

  return (
    <>
      <PageHeader title={t("my:events.title")} description={t("my:events.description")} />

      <MyEventsToolbar
        scope={scope}
        onScopeChange={(value) => void setScope(value as MyEventScope)}
        q={q}
        onQChange={(value) => void setQ(value)}
        filtered={filtered}
        onClear={() => {
          void setQ(null);
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
            <EventList rows={rows} scope={scope} filtered={filtered} onPass={setPassFor} />

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
                      .otherwise(() => t("my:events.loadMore"))}
                  </Button>
                </div>
              ))
              .otherwise(() => null)}
          </div>
        ))
        .otherwise(() => null)}

      <PassDialog eventId={passFor} onClose={() => setPassFor(null)} />
    </>
  );
}

export interface MyEventsPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
}

export function MyEventsPage(props: MyEventsPageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <MyEventsBody />
    </Providers>
  );
}
