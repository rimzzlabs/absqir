import { formatNumber, formatPercent } from "@absqir/core/numbers";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { cn } from "@absqir/ui/lib/utils";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { ClockCounterClockwiseIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useDeferredValue } from "react";
import { match, P } from "ts-pattern";
import { MyHistoryCard } from "@/components/my/my-history-card";
import {
  EVERY_STATUS,
  type HistoryWindow,
  MyHistoryToolbar,
} from "@/components/my/my-history-toolbar";
import { Providers } from "@/components/providers";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { type HistoryRow, type HistorySummary, useMyHistory } from "@/queries/use-my";

const TEXT = parseAsString.withDefault("");
const WHEN = parseAsStringLiteral([
  "any",
  "30d",
  "90d",
  "12m",
] as const satisfies HistoryWindow[]).withDefault("any");

/** What the first screen asks for. The reader loads the rest on demand. */
const PAGE_SIZE = 10;

const LIST = "flex flex-col gap-2";

function Summary(props: { summary: HistorySummary }) {
  const t = useTranslate();
  const { summary } = props;
  // An excused event neither helps nor hurts, so it leaves the sum entirely.
  const judged = summary.total - summary.excused;
  const rate = match(judged)
    .with(0, () => null)
    .otherwise((judged) => (summary.present + summary.late) / judged);

  const cells = [
    {
      key: "attendance",
      label: t("my:history.attendance"),
      value: match(rate)
        .with(P.nullish, () => "—")
        .otherwise((rate) => formatPercent(rate)),
      hint: t("my:history.attendanceHint"),
    },
    { key: "events", label: t("my:history.events"), value: formatNumber(summary.total) },
    { key: "late", label: t("my:history.late"), value: formatNumber(summary.late) },
    { key: "missed", label: t("my:history.missed"), value: formatNumber(summary.absent) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {A.map(cells, (cell) => (
        <Card key={cell.key} size="sm">
          <CardHeader>
            <CardDescription>{cell.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{cell.value}</CardTitle>
            {match(cell.hint)
              .with(P.string, (hint) => (
                <CardDescription className="text-xs">{hint}</CardDescription>
              ))
              .otherwise(() => null)}
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function HistoryList(props: { rows: readonly HistoryRow[]; filtered: boolean }) {
  const t = useTranslate();

  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {match(props.filtered)
              .with(true, () => <MagnifyingGlassIcon />)
              .otherwise(() => (
                <ClockCounterClockwiseIcon />
              ))}
          </EmptyMedia>
          <EmptyTitle>
            {match(props.filtered)
              .with(true, () => t("my:history.noMatch"))
              .otherwise(() => t("my:history.emptyTitle"))}
          </EmptyTitle>
          <EmptyDescription>
            {match(props.filtered)
              .with(true, () => t("my:history.noMatchHint"))
              .otherwise(() => t("my:history.emptyDescription"))}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className={LIST} aria-label={t("my:history.listLabel")}>
      {A.map(props.rows, (row) => (
        <MyHistoryCard key={row.eventId} row={row} />
      ))}
    </ul>
  );
}

function HistoryBody() {
  const t = useTranslate();
  const [q, setQ] = useQueryState("q", TEXT.withOptions({ throttleMs: 300 }));
  const [status, setStatus] = useQueryState("status", TEXT);
  const [when, setWhen] = useQueryState("when", WHEN);
  // The list follows the typing a beat behind, so every keystroke does not fetch.
  const wanted = useDeferredValue(q.trim());
  const history = useMyHistory({ q: wanted, status, when, limit: PAGE_SIZE });
  const pages = history.data?.pages ?? [];
  const rows = A.flatMap(pages, (page) => page.items);
  const summary = A.head(pages)?.summary ?? null;
  const filtered = wanted !== "" || status !== EVERY_STATUS || when !== "any";
  // Nothing to count and nothing to narrow: the page says so and stops there,
  // rather than offering filters over an empty list.
  const blank = summary?.total === 0 && !filtered;
  // A filter is loading over a list that is already on screen.
  const refiltering = history.isFetching && !history.isFetchingNextPage;

  return (
    <>
      <PageHeader title={t("my:history.title")} description={t("my:history.description")} />

      {match(history)
        .with({ isPending: true }, () => (
          <div className="space-y-4" aria-busy>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {A.map([0, 1, 2, 3], (key) => (
                <Skeleton key={key} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-10 rounded-lg" />
            <div className={LIST}>
              {A.map([0, 1, 2, 3, 4], (key) => (
                <Skeleton key={key} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
        ))
        .with({ isError: true }, () => <QueryError query={history} />)
        .when(
          () => blank,
          () => <HistoryList rows={[]} filtered={false} />,
        )
        .otherwise(() => (
          <div className="space-y-4">
            {match(summary)
              .with(P.nonNullable, (summary) => <Summary summary={summary} />)
              .otherwise(() => null)}

            <MyHistoryToolbar
              q={q}
              onQChange={(value) => void setQ(value)}
              status={status}
              onStatusChange={(value) => void setStatus(value || null)}
              when={when}
              onWhenChange={(value) => void setWhen(value)}
              filtered={filtered}
              onClear={() => {
                void setQ(null);
                void setStatus(null);
                void setWhen(null);
              }}
            />

            {/* The old list stays while a new filter loads, dimmed, so the
                page never blinks back to a skeleton under the reader. */}
            <div
              aria-busy={refiltering}
              className={cn(
                "transition-opacity",
                match(refiltering)
                  .with(true, () => "opacity-60" as const)
                  .otherwise(() => "" as const),
              )}
            >
              <HistoryList rows={rows} filtered={filtered} />
            </div>

            {match(rows.length > 0)
              .with(true, () => (
                <div className="flex flex-col items-center gap-2">
                  {/* The summary counts the window alone, so the total only
                      lines up with the list while nothing else narrows it. */}
                  {match(wanted === "" && status === EVERY_STATUS)
                    .with(true, () => (
                      <p aria-live="polite" className="text-muted-foreground text-xs tabular-nums">
                        {t("my:history.shown", {
                          shown: rows.length,
                          total: summary?.total ?? rows.length,
                        })}
                      </p>
                    ))
                    .otherwise(() => null)}
                  {match(history.hasNextPage)
                    .with(true, () => (
                      <Button
                        variant="outline"
                        disabled={history.isFetchingNextPage}
                        onClick={() => void history.fetchNextPage()}
                      >
                        {match(history.isFetchingNextPage)
                          .with(true, () => t("common:actions.loading"))
                          .otherwise(() => t("my:history.loadMore"))}
                      </Button>
                    ))
                    .otherwise(() => null)}
                </div>
              ))
              .otherwise(() => null)}
          </div>
        ))}
    </>
  );
}

export interface MyHistoryPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
}

export function MyHistoryPage(props: MyHistoryPageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <HistoryBody />
    </Providers>
  );
}
