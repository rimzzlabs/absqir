import { Badge } from "@absqir/ui/badge";
import { cn } from "@absqir/ui/lib/utils";

export type SessionStatus = "scheduled" | "running" | "done";
export type AttendanceStatus = "present" | "late" | "excused" | "absent";

const SESSION: Record<SessionStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "" },
  running: {
    label: "Running",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  done: { label: "Done", className: "text-muted-foreground" },
};

const ATTENDANCE: Record<AttendanceStatus, { label: string; className: string }> = {
  present: {
    label: "Present",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  late: {
    label: "Late",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  excused: {
    label: "Excused",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  absent: {
    label: "Absent",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
};

export function SessionStatusBadge(props: { status: SessionStatus }) {
  const item = SESSION[props.status];

  return (
    <Badge variant="outline" className={cn(item.className)}>
      {props.status === "running" ? (
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {item.label}
    </Badge>
  );
}

export function AttendanceStatusBadge(props: { status: AttendanceStatus | null }) {
  if (!props.status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not yet
      </Badge>
    );
  }

  const item = ATTENDANCE[props.status];

  return (
    <Badge variant="outline" className={cn(item.className)}>
      {item.label}
    </Badge>
  );
}

export function attendanceLabel(status: AttendanceStatus): string {
  return ATTENDANCE[status].label;
}
