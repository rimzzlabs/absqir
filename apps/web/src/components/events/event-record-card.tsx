import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Avatar, AvatarFallback } from "@absqir/ui/avatar";
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
import { A } from "@mobily/ts-belt";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { RecordLocationCell } from "@/components/events/record-location";
import { CheckInLine } from "@/components/shared/check-in-line";
import { ListCard } from "@/components/shared/list-card";
import {
  type AttendanceStatus,
  AttendanceStatusBadge,
  attendanceLabel,
} from "@/components/shared/status-badge";
import { initialsOf } from "@/lib/avatar";
import { useSetRecord } from "@/mutations/use-set-record";
import type { Event, EventRecord } from "@/queries/use-events";

export interface EventRecordCardProps {
  event: Event;
  record: EventRecord;
}

const STATUSES: AttendanceStatus[] = ["present", "late", "excused", "absent"];

/** The method codes the API stores, each with a line under `events:records.methods`. */
const METHODS = ["screen", "scanner", "manual", "auto"] as const;

function isMethod(value: string): value is (typeof METHODS)[number] {
  return A.includes(METHODS, value as (typeof METHODS)[number]);
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

/** The one control on the card: what the organizer can set the status to. */
function RecordActions(props: EventRecordCardProps) {
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

/** One person and what this event's record says about them, as a row in the list. */
export function EventRecordCard(props: EventRecordCardProps) {
  const t = useTranslate();
  const { event, record } = props;
  const origin = originOf(t, record);

  return (
    <ListCard>
      <Avatar size="sm" className="mt-0.5 shrink-0">
        <AvatarFallback name={record.name}>{initialsOf(record.name)}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm leading-snug font-medium">{record.name}</p>
            {match(record.identifier)
              .with(P.string.minLength(1), (identifier) => (
                <p className="text-muted-foreground truncate font-mono text-xs">{identifier}</p>
              ))
              .otherwise(() => null)}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <AttendanceStatusBadge status={record.status} />
            <RecordActions {...props} />
          </div>
        </div>

        <CheckInLine
          checkedInAt={record.checkedInAt}
          checkedIn={(time) => time}
          missed={t("events:records.noCheckIn")}
          method={match(record.method)
            .with(P.string.and(P.when(isMethod)), (method) => t(`events:records.methods.${method}`))
            .otherwise(() => null)}
        />

        {match(record.note)
          .with(P.string.minLength(1), (note) => (
            <p className="border-border text-muted-foreground border-l-2 pl-2 text-xs">{note}</p>
          ))
          .otherwise(() => null)}

        <div className="flex flex-wrap items-center gap-1.5 text-xs empty:hidden">
          {match(origin)
            .with(P.string.minLength(1), (origin) => <Badge variant="secondary">{origin}</Badge>)
            .otherwise(() => null)}

          {/* Only an event that asked where anyone was has anything to say. */}
          {match(event.requireLocation)
            .with(true, () => <RecordLocationCell eventId={event.id} record={record} />)
            .otherwise(() => null)}
        </div>
      </div>
    </ListCard>
  );
}
