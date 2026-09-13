import { formatDate } from "@absqir/core/date";
import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Alert, AlertDescription, AlertTitle } from "@absqir/ui/alert";
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
import { DotsThreeIcon, WarningIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { flaggedCount, RecordLocationCell } from "@/components/events/record-location";
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

/** The method codes the API stores, each with a line under `events:records.methods`. */
const METHODS = ["screen", "scanner", "manual", "auto"] as const;

function isMethod(value: string): value is (typeof METHODS)[number] {
  return A.includes(METHODS, value as (typeof METHODS)[number]);
}

function RowActions(props: { event: Event; record: EventRecord }) {
  const t = useTranslate();
  const set = useSetRecord();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("events:records.setStatus", { name: props.record.name })}
          />
        }
      >
        <DotsThreeIcon weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("events:records.markAs")}</DropdownMenuLabel>
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
              {attendanceLabel(t, status)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Registered", "Walk-in", or nothing when the person was simply expected. */
function originOf(t: Translate, record: EventRecord): string | null {
  return match(record.registered)
    .with(true, () => t("events:records.registered"))
    .otherwise(() =>
      match(record.expected)
        .with(true, () => null)
        .otherwise(() => t("events:records.walkIn")),
    );
}

function recordColumns(t: Translate, event: Event): DataColumn<EventRecord>[] {
  // The column only exists on an event that asked. Every other event would
  // show a full column of dashes.
  const whereColumn: DataColumn<EventRecord>[] = match(event.requireLocation)
    .with(true, () => [
      {
        key: "where",
        header: t("events:records.where"),
        cell: (row: EventRecord) => <RecordLocationCell eventId={event.id} record={row} />,
      },
    ])
    .otherwise(() => []);

  return [
    {
      key: "name",
      header: t("events:records.name"),
      place: "primary",
      cell: (row) => (
        <>
          {row.name}
          {match(originOf(t, row))
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
      header: t("events:records.identifier"),
      cell: (row) => row.identifier ?? t("events:records.none"),
      cellClassName: "font-mono text-xs",
    },
    {
      key: "status",
      header: t("events:records.status"),
      cell: (row) => <AttendanceStatusBadge status={row.status} />,
    },
    {
      key: "checkedIn",
      header: t("events:records.checkedIn"),
      cell: (row) =>
        match(row.checkedInAt)
          .with(P.string.minLength(1), (checkedInAt) => formatDate(new Date(checkedInAt), "time"))
          .otherwise(() => t("events:records.none")),
      cellClassName: "text-muted-foreground tabular-nums",
    },
    {
      key: "how",
      header: t("events:records.how"),
      cell: (row) => (
        <>
          {match(row.method)
            .with(P.string.and(P.when(isMethod)), (method) => t(`events:records.methods.${method}`))
            .otherwise(() => t("events:records.none"))}
          {match(row.note)
            .with(P.string.minLength(1), (note) => ` · ${note}`)
            .otherwise(() => "" as const)}
        </>
      ),
      cellClassName: "text-muted-foreground text-xs",
    },
    ...whereColumn,
    {
      key: "actions",
      place: "action",
      headClassName: "w-12",
      cell: (row) => <RowActions event={event} record={row} />,
    },
  ];
}

export function EventRecords(props: EventRecordsProps) {
  const t = useTranslate();
  const records = useEventRecords(props.event.id);

  const flagged = flaggedCount(records.data ?? []);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">{t("events:records.heading")}</h2>

      {/* A flag that nobody sees is a flag that does nothing. */}
      {match(flagged)
        .with(0, () => null)
        .otherwise((count) => (
          <Alert>
            <WarningIcon />
            <AlertTitle>{t("events:records.flagged", { count })}</AlertTitle>
            <AlertDescription>{t("events:records.flaggedHint")}</AlertDescription>
          </Alert>
        ))}

      {match(records)
        .with({ isPending: true }, () => <Skeleton className="h-40 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          match(rows.length)
            .with(0, () => (
              <p className="text-muted-foreground text-sm">{t("events:records.empty")}</p>
            ))
            .otherwise(() => (
              <DataTable
                label={t("events:records.tableLabel")}
                columns={recordColumns(t, props.event)}
                rows={rows}
                getKey={(row) => row.personId}
              />
            )),
        )
        .otherwise(() => null)}
    </section>
  );
}
