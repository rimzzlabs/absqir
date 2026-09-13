import { formatDate } from "@absqir/core/date";
import { Button, buttonVariants } from "@absqir/ui/button";
import { Reveal } from "@absqir/ui/reveal";
import { CheckCircleIcon, ScanIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import type { CheckInResult as Result } from "@/mutations/use-check-in";

export interface CheckInResultProps {
  result: Result;
  /** Clears the result and opens the camera again. */
  onAgain: () => void;
}

/** What the reader sees the moment the check-in lands. */
export function CheckInResult(props: CheckInResultProps) {
  const { result } = props;

  return (
    <Reveal className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center sm:p-8">
      <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/10">
        <CheckCircleIcon weight="fill" className="size-8 text-emerald-500" />
      </span>

      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-balance">
          {match(result.already)
            .with(true, () => `Already in, ${result.personName}`)
            .otherwise(() => `You are in, ${result.personName}`)}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{result.eventTitle}</p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <AttendanceStatusBadge status={result.status} />
        <span className="text-muted-foreground tabular-nums">
          at {formatDate(new Date(result.checkedInAt), "time")}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={props.onAgain}>
          <ScanIcon />
          Scan another
        </Button>
        <a href="/my/history" className={buttonVariants({ variant: "ghost" })}>
          My history
        </a>
      </div>
    </Reveal>
  );
}
