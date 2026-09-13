import { useTranslate } from "@absqir/i18n/react";
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
  /** Fired once the report lands, so the page behind can stop offering it. */
  onSent: () => void;
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
  const t = useTranslate();
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
              .with(true, () => t("checkin:report.sentTitle"))
              .otherwise(() => t("checkin:report.title"))}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {match(send.isSuccess)
              .with(true, () => t("checkin:report.sentDescription"))
              .otherwise(() => t("checkin:report.description"))}
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
                    {t("checkin:report.doneBefore")} <b>{t("checkin:report.doneLink")}</b>.
                  </span>
                </p>
              </ResponsiveDialogBody>
              <ResponsiveDialogFooter>
                <Button onClick={() => props.onOpenChange(false)}>
                  {t("common:actions.close")}
                </Button>
              </ResponsiveDialogFooter>
            </>
          ))
          .otherwise(() => (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!ready) return;

                send.mutate(
                  {
                    eventId: props.eventId,
                    attemptId: props.attemptId,
                    message: message.trim(),
                  },
                  { onSuccess: props.onSent },
                );
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
                  <Label htmlFor="report-message">{t("checkin:report.message")}</Label>
                  <Textarea
                    id="report-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder={t("checkin:report.messagePlaceholder")}
                    autoFocus
                  />
                  <p className="text-muted-foreground text-xs">{t("checkin:report.messageHint")}</p>
                </div>

                <FormError error={send.error} />
              </ResponsiveDialogBody>

              <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                  {t("common:actions.cancel")}
                </Button>
                <Button type="submit" disabled={!ready || send.isPending}>
                  {match(send.isPending)
                    .with(true, () => t("checkin:report.sending"))
                    .otherwise(() => t("checkin:report.send"))}
                </Button>
              </ResponsiveDialogFooter>
            </form>
          ))}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
