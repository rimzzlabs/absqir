import { endOfDay, formatDate, startOfDay } from "@absqir/core/date";
import { buttonVariants } from "@absqir/ui/button";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo } from "react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import {
  presetRange,
  type RangePreset,
  ReportRangeControls,
} from "@/components/reports/report-range";
import { ReportSummaryCards } from "@/components/reports/report-summary";
import {
  GroupReportTable,
  PeopleReportTable,
  SessionReportTable,
} from "@/components/reports/report-tables";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { parseAsLocalDate } from "@/lib/url-state";
import { useGroups } from "@/queries/use-groups";
import {
  type ReportRange,
  reportCsvHref,
  useReportGroups,
  useReportPeople,
  useReportSessions,
  useReportSummary,
} from "@/queries/use-reports";

type ReportTab = "people" | "groups" | "sessions";

const TABS: { value: ReportTab; label: string }[] = [
  { value: "people", label: "By person" },
  { value: "groups", label: "By group" },
  { value: "sessions", label: "By session" },
];

const PARAMS = {
  range: parseAsStringLiteral([
    "7d",
    "30d",
    "month",
    "custom",
  ] as const satisfies RangePreset[]).withDefault("30d"),
  from: parseAsLocalDate,
  to: parseAsLocalDate,
  group: parseAsString,
  tab: parseAsStringLiteral([
    "people",
    "groups",
    "sessions",
  ] as const satisfies ReportTab[]).withDefault("people"),
};

function ReportsBody() {
  const [params, setParams] = useQueryStates(PARAMS);
  const preset = params.range;
  const tab = params.tab;

  // A preset owns its dates. Custom reads them from the URL, and falls back
  // to the last 30 days for whichever end is missing.
  const range = useMemo<ReportRange>(() => {
    const fallback = presetRange("30d");
    const days =
      preset === "custom"
        ? {
            from: params.from ? startOfDay(params.from) : fallback.from,
            to: params.to ? endOfDay(params.to) : fallback.to,
          }
        : presetRange(preset);

    return { ...days, groupId: params.group };
  }, [preset, params.from, params.to, params.group]);

  const setPreset = (next: RangePreset) => {
    void setParams(
      next === "custom"
        ? { range: next, from: range.from, to: range.to }
        : { range: next, from: null, to: null },
    );
  };

  const setRange = (next: ReportRange) => {
    void setParams({
      from: preset === "custom" || next.from.getTime() !== range.from.getTime() ? next.from : null,
      to: preset === "custom" || next.to.getTime() !== range.to.getTime() ? next.to : null,
      group: next.groupId,
    });
  };

  const setTab = (next: ReportTab) => void setParams({ tab: next });

  const groups = useGroups();
  const summary = useReportSummary(range);
  const people = useReportPeople(range);
  const byGroup = useReportGroups(range);
  const bySession = useReportSessions(range);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Who showed up, how often, and how late. Every table downloads as a CSV."
        actions={
          <a
            href={reportCsvHref(tab, range)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <DownloadSimpleIcon />
            Download CSV
          </a>
        }
      />

      <ReportRangeControls
        preset={preset}
        onPresetChange={setPreset}
        range={range}
        onRangeChange={setRange}
        groups={groups.data ?? []}
      />

      <p className="text-muted-foreground text-sm">
        {formatDate(range.from, "date")} to {formatDate(range.to, "date")}
      </p>

      {match(summary)
        .with({ isPending: true }, () => <Skeleton className="h-40 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (data) => <ReportSummaryCards summary={data} />)
        .otherwise(() => null)}

      <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)}>
        <TabsList>
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "people" ? <PeopleReportTable query={people} /> : null}
      {tab === "groups" ? <GroupReportTable query={byGroup} /> : null}
      {tab === "sessions" ? <SessionReportTable query={bySession} /> : null}
    </>
  );
}

export function ReportsPage() {
  return (
    <Providers>
      <ReportsBody />
    </Providers>
  );
}
