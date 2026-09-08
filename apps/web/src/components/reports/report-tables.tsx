import { formatDate } from "@absqir/core/date";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@absqir/ui/table";
import { ChartBarIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { match, P } from "ts-pattern";
import { ratePercent, StatusBar } from "@/components/reports/report-summary";
import { FormError } from "@/components/shared/form-error";
import type {
  GroupReportRow,
  PersonReportRow,
  SessionReportRow,
  useReportPeople,
} from "@/queries/use-reports";

/** Every report table is one query in one of four states. */
type Query<T> = Pick<ReturnType<typeof useReportPeople>, "isPending" | "isError" | "error"> & {
  data?: T[];
};

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

function TableFrame(props: { children: ReactNode }) {
  return <div className="border-border overflow-x-auto rounded-xl border">{props.children}</div>;
}

function CountCells(props: { counts: PersonReportRow["counts"] }) {
  return (
    <>
      <TableCell className="tabular-nums">{props.counts.present}</TableCell>
      <TableCell className="tabular-nums">{props.counts.late}</TableCell>
      <TableCell className="tabular-nums">{props.counts.excused}</TableCell>
      <TableCell className="tabular-nums">{props.counts.absent}</TableCell>
    </>
  );
}

function RateCell(props: { rate: number | null; counts: PersonReportRow["counts"] }) {
  return (
    <TableCell className="w-36">
      <div className="flex items-center gap-2">
        <span className="w-10 tabular-nums">{ratePercent(props.rate)}</span>
        <StatusBar counts={props.counts} className="w-20" />
      </div>
    </TableCell>
  );
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
      rows.length === 0 ? props.empty : props.render(rows),
    )
    .otherwise(() => null);
}

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
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Excused</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>On time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.personId}>
                  <TableCell className="font-medium">
                    {row.name}
                    {row.identifier ? (
                      <p className="text-muted-foreground text-xs">{row.identifier}</p>
                    ) : null}
                  </TableCell>
                  <CountCells counts={row.counts} />
                  <RateCell rate={row.attendanceRate} counts={row.counts} />
                  <TableCell className="tabular-nums">{ratePercent(row.punctualityRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    />
  );
}

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
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>People</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Excused</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.groupId}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="tabular-nums">{row.people}</TableCell>
                  <CountCells counts={row.counts} />
                  <RateCell rate={row.attendanceRate} counts={row.counts} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    />
  );
}

export function SessionReportTable(props: { query: Query<SessionReportRow> }) {
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
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Excused</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.sessionId}>
                  <TableCell className="font-medium">
                    <a href={`/sessions/${row.sessionId}`} className="hover:underline">
                      {row.title}
                    </a>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(new Date(row.startsAt), "weekdayDateTime")}
                      {row.closed ? "" : " · still open"}
                    </p>
                  </TableCell>
                  <CountCells counts={row.counts} />
                  <RateCell rate={row.attendanceRate} counts={row.counts} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    />
  );
}
