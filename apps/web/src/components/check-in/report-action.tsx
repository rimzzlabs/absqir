import { Button } from "@absqir/ui/button";
import { CheckCircleIcon, FlagIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match } from "ts-pattern";
import { ReportDialog } from "@/components/check-in/report-dialog";

export interface ReportActionProps {
  eventId: string;
  /** The refused attempt. Null lets the server take the latest one. */
  attemptId: string | null;
  /** What the server said, repeated back inside the form. */
  refusal: string;
}

/**
 * The way back from a refused check-in: a button, a form, and afterwards the
 * plain fact that it was sent.
 *
 * The sent state matters. Without it the button stays, the member presses it
 * again, and the second try is refused for being a repeat, which reads as
 * the app breaking at the exact moment they are already frustrated.
 *
 * One report stands per person per event, so give this a `key` tied to the
 * attempt when a page can refuse more than once.
 */
export function ReportAction(props: ReportActionProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  return match(sent)
    .with(true, () => (
      <p className="flex items-start gap-2 text-sm">
        <CheckCircleIcon
          weight="fill"
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-emerald-500"
        />
        <span>
          Report sent. An organizer will decide, and you will get a notification either way.
        </span>
      </p>
    ))
    .otherwise(() => (
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
    ));
}
