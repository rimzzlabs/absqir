import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@absqir/ui/dialog";
import { Skeleton } from "@absqir/ui/skeleton";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { useMyPass } from "@/queries/use-my";

export interface PassDialogProps {
  /** Null keeps the dialog closed. */
  eventId: string | null;
  onClose: () => void;
}

/** The member's own QR code for one event, to show at the door. */
export function PassDialog(props: PassDialogProps) {
  const pass = useMyPass(props.eventId);

  return (
    <Dialog open={props.eventId !== null} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle>{pass.data?.eventTitle ?? "Your pass"}</DialogTitle>
          <DialogDescription>
            Show this to the organizer at the door. It is yours alone.
          </DialogDescription>
        </DialogHeader>
        {match(pass)
          .with({ isPending: true }, () => <Skeleton className="mx-auto size-64 rounded-xl" />)
          .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
          .with({ data: P.select(P.nonNullable) }, (data) => (
            <>
              <img
                src={data.qrDataUrl}
                alt="Your pass as a QR code"
                className="border-border mx-auto w-64 rounded-xl border bg-white p-3"
              />
              <p className="text-sm font-medium">{data.personName}</p>
              <p className="text-muted-foreground font-mono text-[10px] break-all">{data.code}</p>
            </>
          ))
          .otherwise(() => null)}
      </DialogContent>
    </Dialog>
  );
}
