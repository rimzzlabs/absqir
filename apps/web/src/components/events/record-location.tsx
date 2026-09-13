import { isRiskReason, RISK_REASON_TEXT } from "@absqir/core/location-risk";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@absqir/ui/popover";
import { A } from "@mobily/ts-belt";
import { CheckIcon, MapPinIcon, WarningIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { useReviewRecord } from "@/mutations/use-review-record";
import type { EventRecord } from "@/queries/use-events";

type RecordLocation = NonNullable<EventRecord["location"]>;

function distanceText(location: RecordLocation): string {
  return match(location.distanceMeters)
    .with(P.number, (meters) =>
      match(meters < 1000)
        .with(true, () => `${meters} m`)
        .otherwise(() => `${(meters / 1000).toFixed(1)} km`),
    )
    .otherwise(() => "—");
}

/**
 * What the fence said about one person, and a way for the organizer to close
 * a flag.
 *
 * Clearing a flag records that somebody read the signals and let the record
 * stand. It never erases them. To reject the check-in, the organizer marks
 * the person absent from the row menu, which is the existing way to say so.
 */
export function RecordLocationCell(props: { eventId: string; record: EventRecord }) {
  const location = props.record.location;
  const review = useReviewRecord();

  if (!location) return <span className="text-muted-foreground">—</span>;

  const reasons = A.filter(location.riskReasons, isRiskReason);

  return match(location.flagged)
    .with(false, () => (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 tabular-nums">
        <MapPinIcon className="size-3.5" />
        {distanceText(location)}
        {match(location.reviewedAt)
          .with(P.string.minLength(1), () => (
            <Badge variant="outline" className="ml-1">
              Reviewed
            </Badge>
          ))
          .otherwise(() => null)}
      </span>
    ))
    .otherwise(() => (
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-500" />
          }
        >
          <WarningIcon weight="fill" />
          Worth a look
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">This reading looks odd</p>
            <p className="text-muted-foreground text-xs">
              {distanceText(location)} from the place. The check-in was accepted, because none of
              this is proof on its own.
            </p>
          </div>

          <ul className="space-y-1.5 text-xs">
            {A.map(reasons, (reason) => (
              <li key={reason} className="flex gap-2">
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <span>{RISK_REASON_TEXT[reason]}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={review.isPending}
              onClick={() =>
                review.mutate({ eventId: props.eventId, personId: props.record.personId })
              }
            >
              <CheckIcon />
              {match(review.isPending)
                .with(true, () => "Clearing…" as const)
                .otherwise(() => "Looks fine, clear the flag" as const)}
            </Button>
            <p className="text-muted-foreground text-xs">
              To reject it, mark {props.record.name} absent from the row menu.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    ));
}

/** How many records on this event still want a human look. */
export function flaggedCount(records: readonly EventRecord[]): number {
  return A.filter(records, (row) => row.location?.flagged === true).length;
}
