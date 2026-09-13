import { formatDate, formatRange } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button, buttonVariants } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { ClockIcon, ScanIcon, TicketIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { opensAtOf } from "@/components/my/opens-at";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import type { MyEvent } from "@/queries/use-my";

export interface MemberHomeNowProps {
  events: readonly MyEvent[];
  onPass: (id: string) => void;
}

/** The one event that matters right now: running, or the next scheduled one. */
export function pickNow(events: readonly MyEvent[]): MyEvent | null {
  return (
    A.getBy(events, (row) => row.status === "running") ??
    A.getBy(events, (row) => row.status === "scheduled") ??
    null
  );
}

function Actions(props: { event: MyEvent; onPass: (id: string) => void }) {
  const { event } = props;

  if (event.record) {
    return (
      <div className="flex items-center gap-3">
        <AttendanceStatusBadge status={event.record.status} />
        {match(event.record.checkedInAt)
          .with(P.string.minLength(1), (checkedInAt) => (
            <span className="text-muted-foreground text-sm tabular-nums">
              at {formatDate(new Date(checkedInAt), "time")}
            </span>
          ))
          .otherwise(() => null)}
      </div>
    );
  }

  if (event.status === "running") {
    return (
      <div className="flex flex-wrap gap-2">
        <a href="/check-in" className={buttonVariants({ size: "lg" })}>
          <ScanIcon />
          Check in
        </a>
        <Button size="lg" variant="outline" onClick={() => props.onPass(event.id)}>
          <TicketIcon />
          My pass
        </Button>
      </div>
    );
  }

  return (
    <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
      <ClockIcon aria-hidden />
      Check-in opens {formatDate(opensAtOf(event), "weekdayDateTime")}
    </p>
  );
}

/** The panel at the top of a member's home: what runs now, or what comes next. */
export function MemberHomeNow(props: MemberHomeNowProps) {
  const next = pickNow(props.events);
  const running = next?.status === "running";
  const idleLabel = match(next)
    .with(P.nullish, () => "Nothing planned" as const)
    .otherwise(() => "Up next" as const);

  return (
    <section
      aria-labelledby="home-now"
      className={cn(
        "bg-card text-card-foreground relative overflow-hidden rounded-2xl p-6 ring-1 sm:p-8",
        match(running)
          .with(true, () => "ring-primary/50" as const)
          .otherwise(() => "ring-foreground/10" as const),
      )}
    >
      {match(running)
        .with(true, () => (
          <div
            aria-hidden
            className="bg-primary/10 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl"
          />
        ))
        .otherwise(() => null)}

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "flex items-center gap-2 text-xs font-medium tracking-wider uppercase",
              match(running)
                .with(true, () => "text-primary" as const)
                .otherwise(() => "text-muted-foreground" as const),
            )}
          >
            {match(running)
              .with(true, () => (
                <span aria-hidden className="bg-primary size-1.5 animate-pulse rounded-full" />
              ))
              .otherwise(() => null)}
            {match(running)
              .with(true, () => "Running now" as const)
              .otherwise(() => idleLabel)}
          </p>
          <h2
            id="home-now"
            className="font-heading mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
          >
            {match(next)
              .with(P.nullish, () => "Nothing expects you right now" as const)
              .otherwise((next) => next.title)}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {match(next)
              .with(
                P.nullish,
                () =>
                  "Events appear here once an organizer plans one for a group you belong to." as const,
              )
              .otherwise((next) => formatRange(new Date(next.startsAt), new Date(next.endsAt)))}
          </p>
          {match(next)
            .when(
              (next): next is NonNullable<typeof next> => (next?.groups.length ?? 0) > 0,
              (next) => (
                <div className="mt-3 flex flex-wrap gap-1">
                  {A.map(next.groups, (group) => (
                    <Badge key={group.id} variant="outline">
                      {group.name}
                    </Badge>
                  ))}
                </div>
              ),
            )
            .otherwise(() => null)}
        </div>

        {match(next)
          .with(P.nullish, () => null)
          .otherwise((next) => (
            <Actions event={next} onPass={props.onPass} />
          ))}
      </div>
    </section>
  );
}
