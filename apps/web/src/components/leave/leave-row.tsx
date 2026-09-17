import { formatDate, formatRange } from "@absqir/core/date";
import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Avatar, AvatarFallback } from "@absqir/ui/avatar";
import { cn } from "@absqir/ui/lib/utils";
import { CheckIcon, ClockIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { match, P } from "ts-pattern";
import { LeaveStatusBadge } from "@/components/shared/status-badge";
import { initialsOf } from "@/lib/avatar";
import { useOrgHref } from "@/lib/org-path";
import type { LeaveRequest } from "@/queries/use-leave";

export interface LeaveRowProps {
  request: LeaveRequest;
  /**
   * Name the asker. The organizer's queue needs it to tell one row from the
   * next; on a member's own page every row is theirs, so it reads "You".
   */
  withPerson?: boolean;
  /** What this reader can do about it, at the foot of the thread. */
  actions?: ReactNode;
}

/**
 * One turn on the rail: a marker, who spoke, when to the minute, and what
 * they said. The line runs from this marker to the next one, and stops at
 * the last turn.
 */
function Turn(props: { marker: ReactNode; who: string; at: string; said: string | null }) {
  return (
    <li className="group relative flex gap-3 pb-4 last:pb-0">
      {/* The rail. It starts under this marker and reaches the next. */}
      <span
        aria-hidden
        className="bg-border absolute top-7 bottom-0 left-3 w-px group-last:hidden"
      />
      {props.marker}

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-muted-foreground flex flex-wrap items-baseline gap-x-1.5 text-xs">
          <span className="text-foreground font-medium">{props.who}</span>
          <span className="tabular-nums">{formatDate(new Date(props.at), "dateTime")}</span>
        </p>
        {match(props.said)
          .with(P.string.minLength(1), (said) => (
            <p className="mt-1 text-sm whitespace-pre-line">{said}</p>
          ))
          .otherwise(() => null)}
      </div>
    </li>
  );
}

/** The word for what the organizer did, as the head of their turn. */
function answerLabel(t: Translate, status: LeaveRequest["status"]): string {
  return match(status)
    .with("approved", () => t("leave:thread.approved"))
    .otherwise(() => t("leave:thread.declined"));
}

/** The marker for the answer: the decision itself, since no name comes with it. */
function AnswerMarker(props: { status: LeaveRequest["status"] }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border",
        match(props.status)
          .with(
            "approved",
            () =>
              "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" as const,
          )
          .otherwise(() => "border-border bg-muted text-muted-foreground" as const),
      )}
    >
      {match(props.status)
        .with("approved", () => <CheckIcon weight="bold" className="size-3" />)
        .otherwise(() => (
          <XIcon weight="bold" className="size-3" />
        ))}
    </span>
  );
}

/**
 * One leave request, as the short exchange it is: somebody asked on a day at
 * a time, and the organizer answered on another. A rail joins the two, so
 * the wait between them is visible rather than inferred.
 *
 * The decision note sits where a reply belongs rather than as a footnote,
 * because on a declined request it is the whole answer.
 */
export function LeaveRow(props: LeaveRowProps) {
  const { request } = props;
  const t = useTranslate();
  const orgHref = useOrgHref();
  const asker = match(props.withPerson)
    .with(true, () => request.personName)
    .otherwise(() => t("leave:thread.you"));

  return (
    <li className="bg-card text-card-foreground ring-foreground/10 min-w-0 rounded-xl ring-1">
      <div className="border-border flex items-start justify-between gap-2 border-b px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <a
            href={orgHref(`/events/${request.eventId}`)}
            className="block truncate text-sm leading-snug font-medium hover:underline"
          >
            {request.eventTitle}
          </a>
          <p className="text-muted-foreground text-xs tabular-nums">
            {formatRange(new Date(request.startsAt), new Date(request.endsAt))}
          </p>
        </div>
        <span className="shrink-0">
          <LeaveStatusBadge status={request.status} />
        </span>
      </div>

      <ol className="px-3 py-3 sm:px-4">
        <Turn
          marker={
            <Avatar size="sm" className="relative z-10 shrink-0">
              <AvatarFallback name={request.personName}>
                {initialsOf(request.personName)}
              </AvatarFallback>
            </Avatar>
          }
          who={t("leave:thread.asked", { name: asker })}
          at={request.createdAt}
          said={request.reason}
        />

        {match(request.decidedAt)
          .with(P.string.minLength(1), (decidedAt) => (
            <Turn
              marker={<AnswerMarker status={request.status} />}
              who={answerLabel(t, request.status)}
              at={decidedAt}
              said={request.decisionNote}
            />
          ))
          // Nothing has come back yet, and the silence is worth saying aloud.
          .otherwise(() => (
            <li className="flex gap-3">
              <span
                aria-hidden
                className="border-border text-muted-foreground relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed"
              >
                <ClockIcon className="size-3" />
              </span>
              <p className="text-muted-foreground pt-1 text-xs">{t("leave:thread.waiting")}</p>
            </li>
          ))}
      </ol>

      {match(props.actions)
        .with(P.nullish, () => null)
        .otherwise((actions) => (
          <div className="border-border flex flex-wrap justify-end gap-2 border-t px-3 py-2.5 sm:px-4">
            {actions}
          </div>
        ))}
    </li>
  );
}
