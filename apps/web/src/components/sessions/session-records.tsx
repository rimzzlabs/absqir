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
import { DotsThreeIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import {
  type AttendanceStatus,
  AttendanceStatusBadge,
  attendanceLabel,
} from "@/components/shared/status-badge";
import { useSetRecord } from "@/mutations/use-set-record";
import { type Session, type SessionRecord, useSessionRecords } from "@/queries/use-sessions";

export interface SessionRecordsProps {
  session: Session;
}

const STATUSES: AttendanceStatus[] = ["present", "late", "excused", "absent"];

const METHODS: Record<string, string> = {
  screen: "scanned the screen",
  scanner: "scanned at the door",
  manual: "set by hand",
  auto: "closed without a check-in",
};

function RowActions(props: { session: Session; record: SessionRecord }) {
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
          {STATUSES.map((status) => (
            <DropdownMenuItem
              key={status}
              disabled={set.isPending || props.record.status === status}
              onClick={() =>
                set.mutate({
                  sessionId: props.session.id,
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

export function SessionRecords(props: SessionRecordsProps) {
  const records = useSessionRecords(props.session.id);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">People</h2>
      {match(records)
        .with({ isPending: true }, () => <Skeleton className="h-40 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nobody is expected. Tick a group on the session, or let walk-ins in.
            </p>
          ) : (
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
                  {rows.map((row) => (
                    <TableRow key={row.personId}>
                      <TableCell className="font-medium">
                        {row.name}
                        {row.registered ? (
                          <Badge variant="secondary" className="ml-2">
                            Registered
                          </Badge>
                        ) : row.expected ? null : (
                          <Badge variant="secondary" className="ml-2">
                            Walk-in
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.identifier ?? "—"}</TableCell>
                      <TableCell>
                        <AttendanceStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {row.checkedInAt ? formatDate(new Date(row.checkedInAt), "time") : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.method ? METHODS[row.method] : "—"}
                        {row.note ? ` · ${row.note}` : ""}
                      </TableCell>
                      <TableCell>
                        <RowActions session={props.session} record={row} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ),
        )
        .otherwise(() => null)}
    </section>
  );
}
