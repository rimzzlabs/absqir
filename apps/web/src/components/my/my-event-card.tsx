import { formatDate } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { ClockIcon, TicketIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { opensAtOf } from "@/components/my/opens-at";
import { AttendanceStatusBadge, EventStatusBadge } from "@/components/shared/status-badge";
import { STRETCHED_LINK } from "@/components/shared/stretched-link";
import type { MyEvent } from "@/queries/use-my";

export interface MyEventCardProps {
  event: MyEvent;
  onPass: (id: string) => void;
}

/** What the card ends with: my record, my pass, or when the door opens. */
function Outcome(props: MyEventCardProps) {
  const { event } = props;

  if (event.record) {
    return (
      <div className="flex items-center gap-2">
        <AttendanceStatusBadge status={event.record.status} />
        {event.record.checkedInAt ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatDate(new Date(event.record.checkedInAt), "time")}
          </span>
        ) : null}
      </div>
    );
  }

  if (event.status === "running") {
    return (
      <Button size="sm" onClick={() => props.onPass(event.id)}>
        <TicketIcon />
        My pass
      </Button>
    );
  }

  if (event.status === "scheduled") {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <ClockIcon aria-hidden />
        Opens {formatDate(opensAtOf(event), "weekdayDateTime")}
      </span>
    );
  }

  return <AttendanceStatusBadge status={null} />;
}

/** One event that expects me, as a card in the grid. A click opens the event. */
export function MyEventCard(props: MyEventCardProps) {
  const { event } = props;
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const sameDay = formatDate(startsAt, "iso") === formatDate(endsAt, "iso");
  const running = event.status === "running";

  return (
    <li
      className={cn(
        "bg-card text-card-foreground relative flex h-full min-w-0 flex-col gap-3 rounded-xl p-4 ring-1 transition-[box-shadow,background-color] hover:bg-accent/40",
        running ? "ring-primary/50" : "ring-foreground/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <EventStatusBadge status={event.status} />
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatDate(startsAt, "time")} to{" "}
          {sameDay ? formatDate(endsAt, "time") : formatDate(endsAt, "weekdayDateTime")}
        </span>
      </div>

      <div className="min-w-0">
        <a
          href={`/events/${event.id}`}
          className={cn(STRETCHED_LINK, "line-clamp-2 block text-sm leading-snug font-medium")}
        >
          {event.title}
        </a>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatDate(startsAt, "weekdayDate")}
        </p>
      </div>

      {event.groups.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {A.map(event.groups, (group) => (
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
