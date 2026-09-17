import { formatDate } from "@absqir/core/date";
import { cn } from "@absqir/ui/lib/utils";
import { match } from "ts-pattern";

export interface DayBlockProps {
  at: Date;
  /** The block of a running event picks up the accent. */
  active?: boolean;
}

/**
 * The day, as a block the reader scans down the list without reading. The
 * last line names the year when the year is not this one, because an old row
 * needs the year more than it needs the weekday.
 */
export function DayBlock(props: DayBlockProps) {
  const active = props.active ?? false;
  const thisYear = formatDate(props.at, "year") === formatDate(new Date(), "year");

  return (
    <div
      className={cn(
        "flex max-h-max w-13 shrink-0 flex-col items-center rounded-lg px-1 py-1.5",
        match(active)
          .with(true, () => "bg-primary/10 text-primary" as const)
          .otherwise(() => "bg-muted/50" as const),
      )}
    >
      <span className={cn("text-[0.625rem] leading-none tracking-wide uppercase", muted(active))}>
        {formatDate(props.at, "month")}
      </span>
      <span className="mt-0.5 text-xl leading-none font-semibold tabular-nums">
        {formatDate(props.at, "dayOfMonth")}
      </span>
      <span className={cn("mt-1 text-[0.625rem] leading-none tabular-nums", muted(active))}>
        {match(thisYear)
          .with(true, () => formatDate(props.at, "weekday"))
          .otherwise(() => formatDate(props.at, "year"))}
      </span>
    </div>
  );
}

/** The accent block keeps its own color, so it dims instead of turning grey. */
function muted(active: boolean) {
  return match(active)
    .with(true, () => "opacity-70" as const)
    .otherwise(() => "text-muted-foreground" as const);
}
