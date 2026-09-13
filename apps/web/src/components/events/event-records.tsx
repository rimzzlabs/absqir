import { formatDate } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@absqir/ui/dropdown-menu";
import { Skeleton } from "@absqir/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@absqir/ui/table";
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
              <div className="border-border overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Identifier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Checked in</TableHead>
                      <TableHead>How</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {A.map(rows, (row) => {
                      const unexpected = match(row.expected)
                        .with(true, () => null)
                        .otherwise(() => "Walk-in" as const);
                      const origin = match(row.registered)
                        .with(true, () => "Registered" as const)
                        .otherwise(() => unexpected);

                      return (
                        <TableRow key={row.personId}>
                          <TableCell className="font-medium">
                            {row.name}
                            {match(origin)
                              .with(P.string.minLength(1), (origin) => (
                                <Badge variant="secondary" className="ml-2">
                                  {origin}
                                </Badge>
                              ))
                              .otherwise(() => null)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.identifier ?? "—"}
                          </TableCell>
                          <TableCell>
                            <AttendanceStatusBadge status={row.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground tabular-nums">
                            {match(row.checkedInAt)
                              .with(P.string.minLength(1), (checkedInAt) =>
                                formatDate(new Date(checkedInAt), "time"),
                              )
                              .otherwise(() => "—" as const)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {match(row.method)
                              .with(P.string.minLength(1), (method) => METHODS[method])
                              .otherwise(() => "—" as const)}
                            {match(row.note)
                              .with(P.string.minLength(1), (note) => ` · ${note}`)
                              .otherwise(() => "" as const)}
                          </TableCell>
                          <TableCell>
                            <RowActions event={props.event} record={row} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )),
        )
        .otherwise(() => null)}
    </section>
  );
}
