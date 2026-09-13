import { Button } from "@absqir/ui/button";
import { Label } from "@absqir/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@absqir/ui/responsive-dialog";
import { Textarea } from "@absqir/ui/textarea";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { match } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { useSendCheckInReport } from "@/mutations/use-check-in-report";

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  /** The refused attempt. Null lets the server take the latest one. */
  attemptId: string | null;
  /** What the server said, repeated back so the member knows what they report. */
  refusal: string;
}

/**
 * The way back for a member the place check refused.
 *
 * They reached this dialog by scanning the live code on the room screen, so
 * they were standing in front of it. Everything the organizer needs to
 * decide is already recorded against the refused attempt; the only thing
 * missing is the member's own account of what went wrong.
 */
export function ReportDialog(props: ReportDialogProps) {
  const [message, setMessage] = useState("");
  const send = useSendCheckInReport();
  const { reset } = send;

  useEffect(() => {
    if (props.open) {
      setMessage("");
      reset();
    }
  }, [props.open, reset]);

  const ready = message.trim().length > 0;

  return (
    <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {match(send.isSuccess)
              .with(true, () => "Report sent" as const)
              .otherwise(() => "Tell the organizer" as const)}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {match(send.isSuccess)
              .with(
                true,
                () =>
                  "An organizer will read it and decide. If they agree, you are marked in at the time you scanned, not at the time they read this.",
              )
              .otherwise(
                () =>
                  "If you are at the event and the check still refused you, say so here. Your scan of the room screen is already on record.",
              )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {match(send.isSuccess)
          .with(true, () => (
            <>
              <ResponsiveDialogBody>
                <p className="flex items-start gap-2 text-sm">
                  <CheckCircleIcon
                    weight="fill"
                    className="mt-0.5 size-5 shrink-0 text-emerald-500"
                  />
                  <span>
                    Nothing else is needed from you. You can close this page and check your record
                    later on <b>My events</b>.
                  </span>
                </p>
              </ResponsiveDialogBody>
              <ResponsiveDialogFooter>
                <Button onClick={() => props.onOpenChange(false)}>Close</Button>
              </ResponsiveDialogFooter>
            </>
          ))
          .otherwise(() => (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!ready) return;

                send.mutate({
                  eventId: props.eventId,
                  attemptId: props.attemptId,
                  message: message.trim(),
                });
              }}
              className="flex min-h-0 flex-1 flex-col gap-4"
              noValidate
            >
              <ResponsiveDialogBody className="flex flex-col gap-4">
                {/* The member should see exactly what they are disputing. */}
                <p className="border-border text-muted-foreground rounded-lg border px-3 py-2 text-sm">
                  {props.refusal}
                </p>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="report-message">What happened?</Label>
                  <Textarea
                    id="report-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="I am in the hall, but my phone keeps putting me on the next street."
                    autoFocus
                  />
                  <p className="text-muted-foreground text-xs">
                    One report per event. Say where you actually are.
                  </p>
                </div>

                <FormError error={send.error} />
              </ResponsiveDialogBody>

              <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!ready || send.isPending}>
                  {match(send.isPending)
                    .with(true, () => "Sending…" as const)
                    .otherwise(() => "Send report" as const)}
                </Button>
              </ResponsiveDialogFooter>
            </form>
          ))}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
