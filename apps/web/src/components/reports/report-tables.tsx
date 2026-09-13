import { formatDate } from "@absqir/core/date";
import { type DataColumn, DataTable } from "@absqir/ui/data-table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { ChartBarIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { match, P } from "ts-pattern";
import { ratePercent, StatusBar } from "@/components/reports/report-summary";
import { FormError } from "@/components/shared/form-error";
import type {
  EventReportRow,
  GroupReportRow,
  PersonReportRow,
  useReportPeople,
} from "@/queries/use-reports";

/** Every report table is one query in one of four states. */
type Query<T> = Pick<ReturnType<typeof useReportPeople>, "isPending" | "isError" | "error"> & {
  data?: T[];
};

/** The four tallies every report row carries. */
type Counts = PersonReportRow["counts"];

function NothingHere(props: { title: string; description: string }) {
  return (
    <Empty className="border-border rounded-xl border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartBarIcon />
        </EmptyMedia>
        <EmptyTitle>{props.title}</EmptyTitle>
        <EmptyDescription>{props.description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

const TALLIES = [
  { key: "present", header: "Present" },
  { key: "late", header: "Late" },
  { key: "excused", header: "Excused" },
  { key: "absent", header: "Absent" },
] as const satisfies readonly { key: keyof Counts; header: string }[];

/** Present, late, excused and absent, the same four columns in every report. */
function countColumns<T extends { counts: Counts }>(): readonly DataColumn<T>[] {
  return A.map(TALLIES, (tally) => ({
    key: tally.key,
    header: tally.header,
    cell: (row: T) => row.counts[tally.key],
    cellClassName: "tabular-nums",
  }));
}

function rateColumn<T extends { counts: Counts; attendanceRate: number | null }>(): DataColumn<T> {
  return {
    key: "attendance",
    header: "Attendance",
    cell: (row) => (
      <div className="flex items-center justify-end gap-2 md:justify-start">
        <span className="w-10 tabular-nums">{ratePercent(row.attendanceRate)}</span>
        <StatusBar counts={row.counts} className="w-20" />
      </div>
    ),
    headClassName: "w-36",
  };
}

/** Renders a table once its query settles, and the right blank state before. */
function ReportQuery<T>(props: {
  query: Query<T>;
  empty: ReactNode;
  render: (rows: T[]) => ReactNode;
}) {
  return match(props.query)
    .with({ isPending: true }, () => <Skeleton className="h-64 rounded-xl" />)
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (rows) =>
      match(rows.length)
        .with(0, () => props.empty)
        .otherwise(() => props.render(rows)),
    )
    .otherwise(() => null);
}

const PEOPLE_COLUMNS: DataColumn<PersonReportRow>[] = [
  {
    key: "person",
    header: "Person",
    place: "primary",
    cell: (row) => (
      <>
        {row.name}
        {match(row.identifier)
          .with(P.string.minLength(1), (identifier) => (
            <p className="text-muted-foreground text-xs">{identifier}</p>
          ))
          .otherwise(() => null)}
      </>
    ),
    cellClassName: "font-medium",
  },
  ...countColumns<PersonReportRow>(),
  rateColumn<PersonReportRow>(),
  {
    key: "punctuality",
    header: "On time",
    cell: (row) => ratePercent(row.punctualityRate),
    cellClassName: "tabular-nums",
  },
];

export function PeopleReportTable(props: { query: Query<PersonReportRow> }) {
  return (
    <ReportQuery
      query={props.query}
      empty={
        <NothingHere
          title="No records in this range"
          description="Records appear once an event in the range has closed, or someone checked in."
        />
      }
      render={(rows) => (
        <DataTable
          label="Attendance by person"
          columns={PEOPLE_COLUMNS}
          rows={rows}
          getKey={(row) => row.personId}
        />
      )}
    />
  );
}

const GROUP_COLUMNS: DataColumn<GroupReportRow>[] = [
  {
    key: "group",
    header: "Group",
    place: "primary",
    cell: (row) => row.name,
    cellClassName: "font-medium",
  },
  {
    key: "people",
    header: "People",
    cell: (row) => row.people,
    cellClassName: "tabular-nums",
  },
  ...countColumns<GroupReportRow>(),
  rateColumn<GroupReportRow>(),
];

export function GroupReportTable(props: { query: Query<GroupReportRow> }) {
  return (
    <ReportQuery
      query={props.query}
      empty={
        <NothingHere
          title="No groups yet"
          description="Put people in a group, and an event can expect the whole group at once."
        />
      }
      render={(rows) => (
        <DataTable
          label="Attendance by group"
          columns={GROUP_COLUMNS}
          rows={rows}
          getKey={(row) => row.groupId}
        />
      )}
    />
  );
}

const EVENT_COLUMNS: DataColumn<EventReportRow>[] = [
  {
    key: "event",
    header: "Event",
    place: "primary",
    cell: (row) => (
      <>
        <a href={`/events/${row.eventId}`} className="hover:underline">
          {row.title}
        </a>
        <p className="text-muted-foreground text-xs">
          {formatDate(new Date(row.startsAt), "weekdayDateTime")}
          {match(row.closed)
            .with(true, () => "" as const)
            .otherwise(() => " · still open" as const)}
        </p>
      </>
    ),
    cellClassName: "font-medium",
  },
  ...countColumns<EventReportRow>(),
  rateColumn<EventReportRow>(),
];

export function EventReportTable(props: { query: Query<EventReportRow> }) {
  return (
    <ReportQuery
      query={props.query}
      empty={
        <NothingHere
          title="No events in this range"
          description="Pick a wider range, or create an event."
        />
      }
      render={(rows) => (
        <DataTable
          label="Attendance by event"
          columns={EVENT_COLUMNS}
          rows={rows}
          getKey={(row) => row.eventId}
        />
      )}
    />
  );
}
