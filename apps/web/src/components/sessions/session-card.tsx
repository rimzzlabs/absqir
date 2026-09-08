import { formatDate } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { CaretRightIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { SessionStatusBadge } from "@/components/shared/status-badge";
import type { Session } from "@/queries/use-sessions";

function Counts(props: { session: Session }) {
  const { counts, status } = props.session;
  const checkedIn = counts.present + counts.late;

  if (status === "scheduled") {
    return (
      <span className="text-muted-foreground text-xs tabular-nums">{counts.expected} expected</span>
    );
  }

  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {checkedIn}/{counts.expected} in
      {counts.late > 0 ? ` · ${counts.late} late` : ""}
      {status === "done" && counts.absent > 0 ? ` · ${counts.absent} absent` : ""}
    </span>
  );
}

/** One event as a card. The whole card is the link. */
export function SessionCard(props: { session: Session }) {
  const { session } = props;
  const startsAt = new Date(session.startsAt);
  const endsAt = new Date(session.endsAt);
  const sameDay = formatDate(startsAt, "iso") === formatDate(endsAt, "iso");

  return (
    <li className="min-w-0">
      <a
        href={`/sessions/${session.id}`}
        className="bg-card text-card-foreground ring-foreground/10 hover:ring-primary/40 focus-visible:ring-ring flex h-full flex-col gap-3 rounded-xl p-4 ring-1 transition-[box-shadow] focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <SessionStatusBadge status={session.status} />
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatDate(startsAt, "time")} to{" "}
            {sameDay ? formatDate(endsAt, "time") : formatDate(endsAt, "weekdayDateTime")}
          </span>
        </div>

        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{session.title}</p>
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
            No group
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <Counts session={session} />
          <CaretRightIcon aria-hidden className="text-muted-foreground" />
        </div>
      </a>
    </li>
  );
}
