import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Badge } from "@absqir/ui/badge";
import { cn } from "@absqir/ui/lib/utils";
import { match } from "ts-pattern";

export type EventStatus = "scheduled" | "running" | "done";
export type AttendanceStatus = "present" | "late" | "excused" | "absent";

// The colours only. Every word comes from the catalog, so a badge reads in
// the language of whoever opens the page.
const EVENT: Record<EventStatus, string> = {
  scheduled: "",
  running: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  done: "text-muted-foreground",
};

const ATTENDANCE: Record<AttendanceStatus, string> = {
  present: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  late: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  excused: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  absent: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function EventStatusBadge(props: { status: EventStatus }) {
  const t = useTranslate();

  return (
    <Badge variant="outline" className={cn(EVENT[props.status])}>
      {match(props.status)
        .with("running", () => (
          <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" />
        ))
        .otherwise(() => null)}
      {t(`common:eventStatus.${props.status}`)}
    </Badge>
  );
}

export function AttendanceStatusBadge(props: { status: AttendanceStatus | null }) {
  const t = useTranslate();

  if (!props.status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {t("common:attendance.notYet")}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn(ATTENDANCE[props.status])}>
      {attendanceLabel(t, props.status)}
    </Badge>
  );
}

export type LeaveStatus = "pending" | "approved" | "declined";

const LEAVE: Record<LeaveStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  declined: "text-muted-foreground",
};

export function LeaveStatusBadge(props: { status: LeaveStatus }) {
  const t = useTranslate();

  return (
    <Badge variant="outline" className={cn(LEAVE[props.status])}>
      {t(`common:leaveStatus.${props.status}`)}
    </Badge>
  );
}

/** The word for a status, for a line that is not a badge. */
export function attendanceLabel(t: Translate, status: AttendanceStatus): string {
  return t(`common:attendance.${status}`);
}
