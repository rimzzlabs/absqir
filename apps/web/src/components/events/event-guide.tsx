import { readAttendance } from "@absqir/core/attendance-counts";
import { formatDate } from "@absqir/core/date";
import { lateAt, opensAt } from "@absqir/core/event-clock";
import { useTranslate } from "@absqir/i18n/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@absqir/ui/alert-dialog";
import { Button } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { ClockIcon, LockIcon, LockOpenIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { useCloseEvent } from "@/mutations/use-close-event";
import { useOpenEvent } from "@/mutations/use-open-event";
import type { Event } from "@/queries/use-events";

export interface EventGuideProps {
  event: Event;
}

/** What the strip says and how it looks, for one state of the clock. */
interface Guidance {
  frame: string;
  icon: ReactNode;
  title: string;
  body: string;
  /** The tint the action button borrows, so it sits on the panel, not over it. */
  action: string;
}

/** Transparent in both themes: the panel behind the button is the background. */
const BARE = "bg-transparent dark:bg-transparent";

/**
 * The state of the event in words, with the one action that changes it.
 *
 * The times an organizer needs are the two the clock decides: when check-in
 * opens, and when it starts counting people late. They read as clock times
 * here, so nobody adds minutes to a start time in their head.
 */
export function EventGuide(props: EventGuideProps) {
  const { event } = props;
  const t = useTranslate();
  const open = useOpenEvent();
  const [closing, setClosing] = useState(false);

  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const times = {
    opens: formatDate(opensAt({ startsAt, opensBeforeMinutes: event.opensBeforeMinutes }), "time"),
    late: formatDate(lateAt({ startsAt, lateAfterMinutes: event.lateAfterMinutes }), "time"),
    ends: formatDate(endsAt, "time"),
  };

  const guidance = match(event.status)
    .with(
      "scheduled",
      (): Guidance => ({
        frame: "border-border bg-card",
        icon: <ClockIcon className="text-muted-foreground" />,
        title: t("events:detail.guide.scheduledTitle"),
        body: t("events:detail.guide.scheduledBody", {
          opens: times.opens,
          count: event.opensBeforeMinutes,
        }),
        action: BARE,
      }),
    )
    .with(
      "running",
      (): Guidance => ({
        frame: "border-emerald-500/40 bg-emerald-500/5",
        icon: <LockOpenIcon className="text-emerald-600 dark:text-emerald-400" />,
        title: t("events:detail.guide.runningTitle"),
        body: t("events:detail.guide.runningBody", { ends: times.ends, late: times.late }),
        action: cn(
          BARE,
          "border-emerald-500/40 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15",
        ),
      }),
    )
    .with(
      "done",
      (): Guidance => ({
        frame: "border-border bg-muted/40",
        icon: <LockIcon className="text-muted-foreground" />,
        title: t("events:detail.guide.doneTitle"),
        body: match(event.closedAt)
          .with(P.string.minLength(1), (closedAt) =>
            t("events:detail.guide.doneBody", {
              when: formatDate(new Date(closedAt), "dateTime"),
            }),
          )
          .otherwise(() => t("events:detail.guide.endedBody", { ends: times.ends })),
        action: BARE,
      }),
    )
    .exhaustive();

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative flex flex-col gap-3 overflow-hidden rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
          guidance.frame,
        )}
      >
        {/* Live means live: the sweep runs only while check-in accepts people. */}
        {match(event.status)
          .with("running", () => (
            <span
              aria-hidden
              className="animate-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/15 to-transparent"
            />
          ))
          .otherwise(() => null)}

        <div className="relative flex items-start gap-3">
          <span aria-hidden className="mt-0.5 shrink-0 [&_svg]:size-4">
            {guidance.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{guidance.title}</p>
            <p className="text-muted-foreground mt-0.5 max-w-prose text-sm">{guidance.body}</p>
          </div>
        </div>

        {match(event.status)
          .with("scheduled", () => (
            <Button
              size="sm"
              variant="outline"
              className={cn("relative w-full shrink-0 sm:w-auto", guidance.action)}
              disabled={open.isPending}
              onClick={() => open.mutate(event.id)}
            >
              <LockOpenIcon />
              {t("events:detail.openNow")}
            </Button>
          ))
          .with("running", () => (
            <Button
              size="sm"
              variant="outline"
              className={cn("relative w-full shrink-0 sm:w-auto", guidance.action)}
              onClick={() => setClosing(true)}
            >
              <LockIcon />
              {t("events:detail.closeNow")}
            </Button>
          ))
          .otherwise(() => null)}
      </div>

      <FormError error={open.error} />

      <CloseDialog event={event} open={closing} onOpenChange={setClosing} />
    </div>
  );
}

/**
 * A close writes the absent rows and cannot be undone, so it asks first and
 * says how many people the click marks absent.
 */
function CloseDialog(props: {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslate();
  const close = useCloseEvent();
  const { notYet } = readAttendance(props.event.counts);

  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("events:detail.closeTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("events:detail.closeDescription")}
            {match(notYet)
              .with(0, () => "" as const)
              .otherwise((count) => ` ${t("events:detail.closeMissing", { count })}`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormError error={close.error} />
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common:actions.notNow")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={close.isPending}
            onClick={() =>
              close.mutate(props.event.id, { onSuccess: () => props.onOpenChange(false) })
            }
          >
            {match(close.isPending)
              .with(true, () => t("events:detail.closing"))
              .otherwise(() => t("events:detail.closeNow"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
