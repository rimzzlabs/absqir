import { Card, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { cn } from "@absqir/ui/lib/utils";
import type { ReportSummary } from "@/queries/use-reports";

/** A rate reads as a whole percent, and an em dash when nothing was judged. */
export function ratePercent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

const BARS = [
  { key: "present", label: "Present", className: "bg-emerald-500" },
  { key: "late", label: "Late", className: "bg-amber-500" },
  { key: "excused", label: "Excused", className: "bg-sky-500" },
  { key: "absent", label: "Absent", className: "bg-destructive" },
] as const;

export function StatusBar(props: { counts: ReportSummary["counts"]; className?: string }) {
  const total = BARS.reduce((sum, bar) => sum + props.counts[bar.key], 0);

  if (total === 0) {
    return <div className={cn("bg-muted h-2 rounded-full", props.className)} />;
  }

  return (
    <div className={cn("bg-muted flex h-2 overflow-hidden rounded-full", props.className)}>
      {BARS.map((bar) => {
        const value = props.counts[bar.key];
        if (value === 0) return null;

        return (
          <span
            key={bar.key}
            className={bar.className}
            style={{ width: `${(value / total) * 100}%` }}
            title={`${bar.label}: ${value}`}
          />
        );
      })}
    </div>
  );
}

function Stat(props: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{props.value}</CardTitle>
        <p className="text-muted-foreground text-xs">{props.hint}</p>
      </CardHeader>
    </Card>
  );
}

export function ReportSummaryCards(props: { summary: ReportSummary }) {
  const { summary } = props;
  const records =
    summary.counts.present + summary.counts.late + summary.counts.excused + summary.counts.absent;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Events"
          value={String(summary.sessions)}
          hint={`${summary.closedSessions} closed, so their absent rows are written`}
        />
        <Stat label="People seen" value={String(summary.people)} hint={`${records} records`} />
        <Stat
          label="Attendance"
          value={ratePercent(summary.attendanceRate)}
          hint="Present or late, over everyone judged. Excused is left out."
        />
        <Stat
          label="On time"
          value={ratePercent(summary.punctualityRate)}
          hint="Of the people who turned up, how many beat the late mark."
        />
      </div>

      <div className="border-border space-y-2 rounded-xl border p-4">
        <StatusBar counts={summary.counts} />
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {BARS.map((bar) => (
            <li key={bar.key} className="flex items-center gap-2">
              <span aria-hidden className={cn("size-2 rounded-full", bar.className)} />
              <span className="text-muted-foreground">{bar.label}</span>
              <span className="tabular-nums">{summary.counts[bar.key]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
