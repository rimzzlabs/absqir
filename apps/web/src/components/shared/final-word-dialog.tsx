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
import type { ReactNode } from "react";
import { FormError } from "@/components/shared/form-error";

export interface FinalWordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** The one line that says what happens the moment the button is pressed. */
  description: ReactNode;
  /** What is lost, in a sentence or two. Words only. */
  children: ReactNode;
  confirmLabel: string;
  pending: boolean;
  error: Error | null;
  onConfirm: () => void;
}

/**
 * The last step of a destructive act: no fields, no icons, nothing to fill
 * in. The reader has already typed the phrase, so all that is left is to
 * read one more time and choose.
 */
export function FinalWordDialog(props: FinalWordDialogProps) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent className="gap-6 p-5 sm:max-w-md">
        <AlertDialogHeader className="gap-3">
          <AlertDialogTitle className="text-lg">{props.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-foreground text-base leading-relaxed">
            {props.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
          {props.children}
          <FormError error={props.error} />
        </div>

        {/* The footer bleeds to the edge, so it tracks the padding above. */}
        <AlertDialogFooter className="-mx-5 -mb-5 p-5">
          <AlertDialogCancel>Go back</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={props.pending}
            onClick={props.onConfirm}
          >
            {props.pending ? "Working…" : props.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
