import { formatDate } from "@absqir/core/date";
import { buttonVariants } from "@absqir/ui/button";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
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

function ReportsBody() {
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [range, setRange] = useState<ReportRange>(() => ({
    ...presetRange("30d"),
    groupId: null,
  }));
  const [tab, setTab] = useState<ReportTab>("people");

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
