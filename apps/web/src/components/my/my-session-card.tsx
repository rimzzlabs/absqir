import { formatDate } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { ClockIcon, TicketIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { MySessionDetails, STRETCHED_TRIGGER } from "@/components/my/my-session-details";
import { opensAtOf } from "@/components/my/opens-at";
import { AttendanceStatusBadge, SessionStatusBadge } from "@/components/shared/status-badge";
import type { MySession } from "@/queries/use-my";

export interface MySessionCardProps {
  session: MySession;
  onPass: (id: string) => void;
  onAskLeave: (session: MySession) => void;
}

/** What the card ends with: my record, my pass, or when the door opens. */
function Outcome(props: MySessionCardProps) {
  const { session } = props;

  if (session.record) {
    return (
      <div className="flex items-center gap-2">
        <AttendanceStatusBadge status={session.record.status} />
        {session.record.checkedInAt ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatDate(new Date(session.record.checkedInAt), "time")}
          </span>
        ) : null}
      </div>
    );
  }

  if (session.status === "running") {
    return (
      <Button size="sm" onClick={() => props.onPass(session.id)}>
        <TicketIcon />
        My pass
      </Button>
    );
  }

  if (session.status === "scheduled") {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <ClockIcon aria-hidden />
        Opens {formatDate(opensAtOf(session), "weekdayDateTime")}
      </span>
    );
  }

  return <AttendanceStatusBadge status={null} />;
}

/** One event that expects me, as a card in the grid. A click opens its details. */
export function MySessionCard(props: MySessionCardProps) {
  const { session } = props;
  const startsAt = new Date(session.startsAt);
  const endsAt = new Date(session.endsAt);
  const sameDay = formatDate(startsAt, "iso") === formatDate(endsAt, "iso");
  const running = session.status === "running";
  const card = useRef<HTMLLIElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <li
      ref={card}
      className={cn(
        "bg-card text-card-foreground relative flex h-full min-w-0 flex-col gap-3 rounded-xl p-4 ring-1 transition-[box-shadow,background-color]",
        running ? "ring-primary/50" : "ring-foreground/10",
        open ? "bg-accent/40" : "hover:bg-accent/40",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <SessionStatusBadge status={session.status} />
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatDate(startsAt, "time")} to{" "}
          {sameDay ? formatDate(endsAt, "time") : formatDate(endsAt, "weekdayDateTime")}
        </span>
      </div>

      <div className="min-w-0">
        <MySessionDetails
          session={session}
          open={open}
          onOpenChange={setOpen}
          anchor={card}
          onPass={props.onPass}
          onAskLeave={props.onAskLeave}
          trigger={
            <button
              type="button"
              className={cn(STRETCHED_TRIGGER, "line-clamp-2 text-sm leading-snug font-medium")}
            >
              {session.title}
            </button>
          }
        />
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatDate(startsAt, "weekdayDate")}
        </p>
      </div>

      {session.groups.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {session.groups.map((group) => (
            <Badge key={group.id} variant="outline">
              {group.name}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <UsersThreeIcon aria-hidden />
          Registered
        </p>
      )}

      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-1">
        <Outcome {...props} />
      </div>
    </li>
  );
}
