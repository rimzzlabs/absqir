import { formatDate, formatRange } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button, buttonVariants } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { ClockIcon, ScanIcon, TicketIcon } from "@phosphor-icons/react";
import { opensAtOf } from "@/components/my/opens-at";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import type { MySession } from "@/queries/use-my";

export interface MemberHomeNowProps {
  sessions: MySession[];
  onPass: (id: string) => void;
}

/** The one event that matters right now: running, or the next scheduled one. */
export function pickNow(sessions: MySession[]): MySession | null {
  return (
    sessions.find((row) => row.status === "running") ??
    sessions.find((row) => row.status === "scheduled") ??
    null
  );
}

function Actions(props: { session: MySession; onPass: (id: string) => void }) {
  const { session } = props;

  if (session.record) {
    return (
      <div className="flex items-center gap-3">
        <AttendanceStatusBadge status={session.record.status} />
        {session.record.checkedInAt ? (
          <span className="text-muted-foreground text-sm tabular-nums">
            at {formatDate(new Date(session.record.checkedInAt), "time")}
          </span>
        ) : null}
      </div>
    );
  }

  if (session.status === "running") {
    return (
      <div className="flex flex-wrap gap-2">
        <a href="/check-in" className={buttonVariants({ size: "lg" })}>
          <ScanIcon />
          Check in
        </a>
        <Button size="lg" variant="outline" onClick={() => props.onPass(session.id)}>
          <TicketIcon />
          My pass
        </Button>
      </div>
    );
  }

  return (
    <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
      <ClockIcon aria-hidden />
      Check-in opens {formatDate(opensAtOf(session), "weekdayDateTime")}
    </p>
  );
}

/** The panel at the top of a member's home: what runs now, or what comes next. */
export function MemberHomeNow(props: MemberHomeNowProps) {
  const next = pickNow(props.sessions);
  const running = next?.status === "running";
  const idleLabel = next ? "Up next" : "Nothing planned";

  return (
    <section
      aria-labelledby="home-now"
      className={cn(
        "bg-card text-card-foreground relative overflow-hidden rounded-2xl p-6 ring-1 sm:p-8",
        running ? "ring-primary/50" : "ring-foreground/10",
      )}
    >
      {running ? (
        <div
          aria-hidden
          className="bg-primary/10 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl"
        />
      ) : null}

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "flex items-center gap-2 text-xs font-medium tracking-wider uppercase",
              running ? "text-primary" : "text-muted-foreground",
            )}
          >
            {running ? (
              <span aria-hidden className="bg-primary size-1.5 animate-pulse rounded-full" />
            ) : null}
            {running ? "Running now" : idleLabel}
          </p>
          <h2
            id="home-now"
            className="font-heading mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
          >
            {next ? next.title : "Nothing expects you right now"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {next
              ? formatRange(new Date(next.startsAt), new Date(next.endsAt))
              : "Events appear here once an organizer plans one for a group you belong to."}
          </p>
          {next && next.groups.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {next.groups.map((group) => (
                <Badge key={group.id} variant="outline">
                  {group.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {next ? <Actions session={next} onPass={props.onPass} /> : null}
      </div>
    </section>
  );
}
