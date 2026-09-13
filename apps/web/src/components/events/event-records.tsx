import { formatDate } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { type DataColumn, DataTable } from "@absqir/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@absqir/ui/dropdown-menu";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import {
  type AttendanceStatus,
  AttendanceStatusBadge,
  attendanceLabel,
} from "@/components/shared/status-badge";
import { useSetRecord } from "@/mutations/use-set-record";
import { type Event, type EventRecord, useEventRecords } from "@/queries/use-events";

export interface EventRecordsProps {
  event: Event;
}

const STATUSES: AttendanceStatus[] = ["present", "late", "excused", "absent"];

const METHODS: Record<string, string> = {
  screen: "scanned the screen",
  scanner: "scanned at the door",
  manual: "set by hand",
  auto: "closed without a check-in",
};

function RowActions(props: { event: Event; record: EventRecord }) {
  const set = useSetRecord();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Set status for ${props.record.name}`}
          />
        }
      >
        <DotsThreeIcon weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mark as</DropdownMenuLabel>
          {A.map(STATUSES, (status) => (
            <DropdownMenuItem
              key={status}
              disabled={set.isPending || props.record.status === status}
              onClick={() =>
                set.mutate({
                  eventId: props.event.id,
                  personId: props.record.personId,
                  status,
                  note: null,
                })
              }
            >
              {attendanceLabel(status)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Registered", "Walk-in", or nothing when the person was simply expected. */
function originOf(record: EventRecord): string | null {
  return match(record.registered)
    .with(true, () => "Registered" as const)
    .otherwise(() =>
      match(record.expected)
        .with(true, () => null)
        .otherwise(() => "Walk-in" as const),
    );
}

function recordColumns(event: Event): DataColumn<EventRecord>[] {
  return [
    {
      key: "name",
      header: "Name",
      place: "primary",
      cell: (row) => (
        <>
          {row.name}
          {match(originOf(row))
            .with(P.string.minLength(1), (origin) => (
              <Badge variant="secondary" className="ml-2">
                {origin}
              </Badge>
            ))
            .otherwise(() => null)}
        </>
      ),
      cellClassName: "font-medium",
    },
    {
      key: "identifier",
      header: "Identifier",
      cell: (row) => row.identifier ?? "—",
      cellClassName: "font-mono text-xs",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <AttendanceStatusBadge status={row.status} />,
    },
    {
      key: "checkedIn",
      header: "Checked in",
      cell: (row) =>
        match(row.checkedInAt)
          .with(P.string.minLength(1), (checkedInAt) => formatDate(new Date(checkedInAt), "time"))
          .otherwise(() => "—" as const),
      cellClassName: "text-muted-foreground tabular-nums",
    },
    {
      key: "how",
      header: "How",
      cell: (row) => (
        <>
          {match(row.method)
            .with(P.string.minLength(1), (method) => METHODS[method])
            .otherwise(() => "—" as const)}
          {match(row.note)
            .with(P.string.minLength(1), (note) => ` · ${note}`)
            .otherwise(() => "" as const)}
        </>
      ),
      cellClassName: "text-muted-foreground text-xs",
    },
    {
      key: "actions",
      place: "action",
      headClassName: "w-12",
      cell: (row) => <RowActions event={event} record={row} />,
    },
  ];
}

export function EventRecords(props: EventRecordsProps) {
  const records = useEventRecords(props.event.id);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">People</h2>
      {match(records)
        .with({ isPending: true }, () => <Skeleton className="h-40 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          match(rows.length)
            .with(0, () => (
              <p className="text-muted-foreground text-sm">
                Nobody is expected. Tick a group on the event, or let walk-ins in.
              </p>
            ))
            .otherwise(() => (
              <DataTable
                label="People expected at this event"
                columns={recordColumns(props.event)}
                rows={rows}
                getKey={(row) => row.personId}
              />
            )),
        )
        .otherwise(() => null)}
    </section>
  );
}
