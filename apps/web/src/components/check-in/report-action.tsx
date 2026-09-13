import { Button } from "@absqir/ui/button";
import { CheckCircleIcon, ClockIcon, FlagIcon, InfoIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { ReportDialog } from "@/components/check-in/report-dialog";
import type { ReportState } from "@/mutations/use-check-in";

export interface ReportActionProps {
  eventId: string;
  /** The refused attempt. Null lets the server take the latest one. */
  attemptId: string | null;
  /** What the server said, repeated back inside the form. */
  refusal: string;
  /** What this member already sent about this event. Null means nothing yet. */
  reportStatus: ReportState | null;
}

function Note(props: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm">
      <span aria-hidden className="mt-0.5 shrink-0">
        {props.icon}
      </span>
      <span>{props.children}</span>
    </p>
  );
}

/**
 * The way back from a refused check-in.
 *
 * One report stands per person per event, so the state is read before the
 * button is offered. Handing somebody a form, letting them write out their
 * problem, and only then refusing the send is the worst version of this: it
 * wastes their effort at the moment they are already stuck.
 *
 * A decision is final here. Somebody the organizer turned down is told so
 * plainly and pointed at a person rather than at the same form again.
 */
export function ReportAction(props: ReportActionProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const state = match(sent)
    .with(true, () => "pending" as const)
    .otherwise(() => props.reportStatus);

  return match(state)
    .with("pending", () => (
      <Note icon={<ClockIcon className="size-4" />}>
        You reported this, and an organizer has not decided yet. You will get a notification either
        way.
      </Note>
    ))
    .with("approved", () => (
      <Note icon={<CheckCircleIcon weight="fill" className="size-4 text-emerald-500" />}>
        An organizer accepted your report, so your attendance is already recorded for this event.
      </Note>
    ))
    .with("declined", () => (
      // Never call the member a liar. An organizer can turn a report down for
      // reasons that have nothing to do with honesty, and the member needs a
      // next step rather than a verdict.
      <Note icon={<InfoIcon className="size-4" />}>
        An organizer read your report and did not accept it, so this event stays as it is. Talk to
        them if that is wrong. They can still mark you in by hand.
      </Note>
    ))
    .with(P.nullish, () => (
      <>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <FlagIcon />I am here, tell the organizer
        </Button>

        <ReportDialog
          open={open}
          onOpenChange={setOpen}
          eventId={props.eventId}
          attemptId={props.attemptId}
          refusal={props.refusal}
          onSent={() => setSent(true)}
        />
      </>
    ))
    .exhaustive();
}
