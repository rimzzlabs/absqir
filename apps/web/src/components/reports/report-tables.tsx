import { formatDate } from "@absqir/core/date";
import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
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
  "present",
  "late",
  "excused",
  "absent",
] as const satisfies readonly (keyof Counts)[];

/** Present, late, excused and absent, the same four columns in every report. */
function countColumns<T extends { counts: Counts }>(t: Translate): readonly DataColumn<T>[] {
  return A.map(TALLIES, (tally) => ({
    key: tally,
    header: t(`common:attendance.${tally}`),
    cell: (row: T) => row.counts[tally],
    cellClassName: "tabular-nums",
  }));
}

function rateColumn<T extends { counts: Counts; attendanceRate: number | null }>(
  t: Translate,
): DataColumn<T> {
  return {
    key: "attendance",
    header: t("reports:tables.attendance"),
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

function peopleColumns(t: Translate): DataColumn<PersonReportRow>[] {
  return [
    {
      key: "person",
      header: t("reports:tables.person"),
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
    ...countColumns<PersonReportRow>(t),
    rateColumn<PersonReportRow>(t),
    {
      key: "punctuality",
      header: t("reports:tables.onTime"),
      cell: (row) => ratePercent(row.punctualityRate),
      cellClassName: "tabular-nums",
    },
  ];
}

export function PeopleReportTable(props: { query: Query<PersonReportRow> }) {
  const t = useTranslate();

  return (
    <ReportQuery
      query={props.query}
      empty={
        <NothingHere
          title={t("reports:tables.emptyPeopleTitle")}
          description={t("reports:tables.emptyPeopleDescription")}
        />
      }
      render={(rows) => (
        <DataTable
          label={t("reports:tables.byPerson")}
          columns={peopleColumns(t)}
          rows={rows}
          getKey={(row) => row.personId}
        />
      )}
    />
  );
}

function groupColumns(t: Translate): DataColumn<GroupReportRow>[] {
  return [
    {
      key: "group",
      header: t("reports:tables.group"),
      place: "primary",
      cell: (row) => row.name,
      cellClassName: "font-medium",
    },
    {
      key: "people",
      header: t("reports:tables.people"),
      cell: (row) => row.people,
      cellClassName: "tabular-nums",
    },
    ...countColumns<GroupReportRow>(t),
    rateColumn<GroupReportRow>(t),
  ];
}

export function GroupReportTable(props: { query: Query<GroupReportRow> }) {
  const t = useTranslate();

  return (
    <ReportQuery
      query={props.query}
      empty={
        <NothingHere
          title={t("reports:tables.emptyGroupsTitle")}
          description={t("reports:tables.emptyGroupsDescription")}
        />
      }
      render={(rows) => (
        <DataTable
          label={t("reports:tables.byGroup")}
          columns={groupColumns(t)}
          rows={rows}
          getKey={(row) => row.groupId}
        />
      )}
    />
  );
}

function eventColumns(t: Translate): DataColumn<EventReportRow>[] {
  return [
    {
      key: "event",
      header: t("reports:tables.event"),
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
              .otherwise(() => t("reports:tables.stillOpen"))}
          </p>
        </>
      ),
      cellClassName: "font-medium",
    },
    ...countColumns<EventReportRow>(t),
    rateColumn<EventReportRow>(t),
  ];
}

export function EventReportTable(props: { query: Query<EventReportRow> }) {
  const t = useTranslate();

  return (
    <ReportQuery
      query={props.query}
      empty={
        <NothingHere
          title={t("reports:tables.emptyEventsTitle")}
          description={t("reports:tables.emptyEventsDescription")}
        />
      }
      render={(rows) => (
        <DataTable
          label={t("reports:tables.byEvent")}
          columns={eventColumns(t)}
          rows={rows}
          getKey={(row) => row.eventId}
        />
      )}
    />
  );
}
