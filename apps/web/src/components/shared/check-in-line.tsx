import { formatDate } from "@absqir/core/date";
import { CheckCircleIcon, MinusCircleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { match, P } from "ts-pattern";

export interface CheckInLineProps {
  checkedInAt: string | null;
  /** The line for a check-in, with the time already in it. */
  checkedIn: (time: string) => string;
  /** The line when no check-in happened. */
  missed: string;
  /** How the record came to be, when the card knows. */
  method?: ReactNode;
}

/** What a record says about the check-in, in one line. */
export function CheckInLine(props: CheckInLineProps) {
  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
      {match(props.checkedInAt)
        .with(P.string.minLength(1), (checkedInAt) => (
          <>
            <CheckCircleIcon aria-hidden className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-foreground tabular-nums">
              {props.checkedIn(formatDate(new Date(checkedInAt), "time"))}
            </span>
          </>
        ))
        .otherwise(() => (
          <>
            <MinusCircleIcon aria-hidden />
            <span>{props.missed}</span>
          </>
        ))}

      {match(props.method)
        .with(P.nullish, () => null)
        .otherwise((method) => (
          <>
            <span aria-hidden>·</span>
            <span>{method}</span>
          </>
        ))}
    </p>
  );
}
