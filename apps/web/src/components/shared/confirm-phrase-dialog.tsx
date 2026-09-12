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
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { type ReactNode, useId, useState } from "react";

export interface ConfirmPhraseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** The exact text the reader types before the button wakes up. */
  phrase: string;
  /** What the phrase is, such as "organization slug". */
  phraseLabel: string;
  confirmLabel: string;
  /** False while a field above the phrase is still empty. */
  canConfirm?: boolean;
  /** Fields above the phrase, such as a password. */
  children?: ReactNode;
  onConfirm: () => void;
}

/**
 * The first of two steps: the reader copies an exact word, and whatever
 * else the act needs. Nothing is destroyed here. The button hands over to
 * the last word.
 */
export function ConfirmPhraseDialog(props: ConfirmPhraseDialogProps) {
  const [typed, setTyped] = useState("");
  const fieldId = useId();
  const ready = typed.trim() === props.phrase && (props.canConfirm ?? true);

  const close = (open: boolean) => {
    if (!open) setTyped("");
    props.onOpenChange(open);
  };

  return (
    <AlertDialog open={props.open} onOpenChange={close}>
      <AlertDialogContent className="gap-6 p-5 sm:max-w-md">
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription>{props.description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-5">
          {props.children}

          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              Type <span className="text-foreground font-medium">{props.phrase}</span> to confirm
            </Label>
            <Input
              id={fieldId}
              value={typed}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={`Type the ${props.phraseLabel} to confirm`}
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
        </div>

        {/* The footer bleeds to the edge, so it tracks the padding above. */}
        <AlertDialogFooter className="-mx-5 -mb-5 p-5">
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!ready}
            onClick={() => {
              setTyped("");
              props.onConfirm();
            }}
          >
            {props.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
