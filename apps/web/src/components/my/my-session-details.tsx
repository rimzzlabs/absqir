import { formatDate, formatRange, isSameDay } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button, buttonVariants } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@absqir/ui/popover";
import { Separator } from "@absqir/ui/separator";
import { A } from "@mobily/ts-belt";
import { NotePencilIcon, ScanIcon, TicketIcon } from "@phosphor-icons/react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { opensAtOf } from "@/components/my/opens-at";
import { FormError } from "@/components/shared/form-error";
import {
  AttendanceStatusBadge,
  LeaveStatusBadge,
  SessionStatusBadge,
} from "@/components/shared/status-badge";
import { useWithdrawLeave } from "@/mutations/use-withdraw-leave";
import type { MySession } from "@/queries/use-my";

export interface MySessionDetailsProps {
  session: MySession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The card or row the popover hangs from. */
  anchor: RefObject<HTMLElement | null>;
  /** The element that opens it. Base UI renders it as the trigger. */
  trigger: ReactElement;
  onPass: (id: string) => void;
  onAskLeave: (session: MySession) => void;
}

/**
 * The clickable part of a card or a row. It stretches over the whole parent
 * through its pseudo-element, so the parent needs `relative`, and any button
 * beside it needs `relative z-10` to stay reachable.
 */
export const STRETCHED_TRIGGER =
  "min-w-0 cursor-pointer text-left outline-none after:absolute after:inset-0 after:cursor-pointer after:rounded-[inherit] focus-visible:after:ring-3 focus-visible:after:ring-ring/50";

/** A time on the event's own day reads as a clock, elsewhere with the day. */
function timeNear(value: Date, day: Date): string {
  return isSameDay(value, day) ? formatDate(value, "time") : formatDate(value, "weekdayDateTime");
}

function Row(props: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{props.label}</dt>
      <dd className="min-w-0">{props.children}</dd>
    </>
  );
}

/** What the event says about me: my record, my request, or nothing yet. */
function MySide(props: { session: MySession }) {
  const { session } = props;
  const withdraw = useWithdrawLeave();

  if (session.record) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AttendanceStatusBadge status={session.record.status} />
          {session.record.checkedInAt ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              at {formatDate(new Date(session.record.checkedInAt), "time")}
            </span>
          ) : null}
        </div>
        {session.record.note ? (
          <p className="text-muted-foreground border-border border-l-2 pl-3 text-xs">
            {session.record.note}
          </p>
        ) : null}
      </div>
    );
  }

  if (session.leave) {
    const { leave } = session;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Leave</span>
          <LeaveStatusBadge status={leave.status} />
        </div>
        <p className="line-clamp-3 text-xs">{leave.reason}</p>
        {leave.decisionNote ? (
          <p className="text-muted-foreground border-border border-l-2 pl-3 text-xs">
            {leave.decisionNote}
          </p>
        ) : null}
        {leave.status === "pending" ? (
          <Button
            size="xs"
            variant="outline"
            disabled={withdraw.isPending}
            onClick={() => withdraw.mutate(leave.id)}
          >
            {withdraw.isPending ? "Withdrawing…" : "Withdraw"}
          </Button>
        ) : null}
        <FormError error={withdraw.error} />
      </div>
    );
  }

  return (
    <p className="text-muted-foreground text-xs">
      {session.status === "done" ? "No record for you." : "No record yet."}
    </p>
  );
}

function Actions(props: MySessionDetailsProps) {
  const { session } = props;
  const running = session.status === "running";
  const canAsk = session.status !== "done" && !session.record && !session.leave;

  if (session.record || (!running && !canAsk)) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {running ? (
        <>
          <a href="/check-in" className={buttonVariants({ size: "sm" })}>
            <ScanIcon />
            Check in
          </a>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              props.onOpenChange(false);
              props.onPass(session.id);
            }}
          >
            <TicketIcon />
            My pass
          </Button>
        </>
      ) : null}
      {canAsk ? (
        <Button
          size="sm"
          variant={running ? "ghost" : "outline"}
          onClick={() => {
            props.onOpenChange(false);
            props.onAskLeave(session);
          }}
        >
          <NotePencilIcon />
          Ask for leave
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Everything about one of my events, hanging off its card or agenda row:
 * the times that matter to me, my record or my request, and the one or two
 * things I can do about it.
 */
export function MySessionDetails(props: MySessionDetailsProps) {
  const { session } = props;
  const startsAt = new Date(session.startsAt);
  const endsAt = new Date(session.endsAt);
  const lateAt = new Date(startsAt.getTime() + session.lateAfterMinutes * 60_000);

  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <PopoverTrigger render={props.trigger} />
      <PopoverContent
        anchor={props.anchor}
        align="start"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-2rem)] gap-3 p-4"
      >
        <PopoverHeader className="gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <SessionStatusBadge status={session.status} />
          </div>
          <PopoverTitle className="font-heading text-base leading-snug font-semibold text-balance">
            {session.title}
          </PopoverTitle>
          <PopoverDescription className="text-xs">
            {formatRange(startsAt, endsAt)}
          </PopoverDescription>
        </PopoverHeader>

        {session.description ? (
          <p className="line-clamp-4 text-xs leading-relaxed">{session.description}</p>
        ) : null}

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
          {session.status !== "done" ? (
            <Row label="Door opens">
              <span className="tabular-nums">{timeNear(opensAtOf(session), startsAt)}</span>
            </Row>
          ) : null}
          <Row label="Late after">
            <span className="tabular-nums">{timeNear(lateAt, startsAt)}</span>
          </Row>
          {session.groups.length > 0 ? (
            <Row label="Groups">
              <div className="flex flex-wrap gap-1">
                {A.map(session.groups, (group) => (
                  <Badge key={group.id} variant="outline" className="text-[11px]">
                    {group.name}
                  </Badge>
                ))}
              </div>
            </Row>
          ) : (
            <Row label="Through">Registration</Row>
          )}
        </dl>

        <Separator />

        <section aria-label="My side" className={cn("space-y-3")}>
          <MySide session={session} />
          <Actions {...props} />
        </section>
      </PopoverContent>
    </Popover>
  );
}
