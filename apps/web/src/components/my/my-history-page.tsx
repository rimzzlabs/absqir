import { formatDate, formatRange } from "@absqir/core/date";
import { Card, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { type DataColumn, DataTable } from "@absqir/ui/data-table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { type HistoryRow, useMyHistory } from "@/queries/use-my";

function Summary(props: { rows: HistoryRow[] }) {
  const total = props.rows.length;
  const on = A.filter(
    props.rows,
    (row) => row.status === "present" || row.status === "late",
  ).length;
  const late = A.filter(props.rows, (row) => row.status === "late").length;
  const rate = match(total)
    .with(0, () => 0 as const)
    .otherwise((total) => Math.round((on / total) * 100));

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card size="sm">
        <CardHeader>
          <CardDescription>Attendance</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{rate}%</CardTitle>
        </CardHeader>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardDescription>Events</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{total}</CardTitle>
        </CardHeader>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardDescription>Late</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{late}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

const HISTORY_COLUMNS: DataColumn<HistoryRow>[] = [
  {
    key: "title",
    header: "Event",
    place: "primary",
    cell: (row) => row.title,
    cellClassName: "font-medium",
  },
  {
    key: "when",
    header: "When",
    cell: (row) => formatRange(new Date(row.startsAt), new Date(row.endsAt)),
    cellClassName: "text-muted-foreground",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <AttendanceStatusBadge status={row.status} />,
  },
  {
    key: "checkedIn",
    header: "Checked in",
    cell: (row) => (
      <>
        {match(row.checkedInAt)
          .with(P.string.minLength(1), (checkedInAt) => formatDate(new Date(checkedInAt), "time"))
          .otherwise(() => "—" as const)}
        {match(row.note)
          .with(P.string.minLength(1), (note) => ` · ${note}`)
          .otherwise(() => "" as const)}
      </>
    ),
    cellClassName: "text-muted-foreground tabular-nums",
  },
];

function HistoryBody() {
  const history = useMyHistory();

  return (
    <>
      <PageHeader
        title="History"
        description="Your own record, event by event. Nobody else in the organization sees this page."
      />

      {match(history)
        .with({ isPending: true }, () => <Skeleton className="h-40 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          match(rows.length)
            .with(0, () => (
              <Empty className="border-border rounded-xl border border-dashed py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClockCounterClockwiseIcon />
                  </EmptyMedia>
                  <EmptyTitle>No record yet</EmptyTitle>
                  <EmptyDescription>Your first closed event shows up here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ))
            .otherwise(() => (
              <>
                <Summary rows={rows} />
                <DataTable
                  label="Your record, event by event"
                  columns={HISTORY_COLUMNS}
                  rows={rows}
                  getKey={(row) => row.eventId}
                />
              </>
            )),
        )
        .otherwise(() => null)}
    </>
  );
}

export function MyHistoryPage() {
  return (
    <Providers>
      <HistoryBody />
    </Providers>
  );
}
