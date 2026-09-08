import { formatRange } from "@absqir/core/date";
import { Button } from "@absqir/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@absqir/ui/item";
import { Skeleton } from "@absqir/ui/skeleton";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { useOnboardingEvent } from "@/mutations/use-onboarding-event";
import { useEvent } from "@/queries/use-event";

export interface OnboardingEventCardProps {
  eventId: string;
}

/** Step 3 through a public event page: one card, one button. */
export function OnboardingEventCard(props: OnboardingEventCardProps) {
  const event = useEvent(props.eventId);
  const join = useOnboardingEvent();

  return match(event)
    .with({ isPending: true }, () => <Skeleton className="h-20 rounded-xl" />)
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <div className="space-y-3">
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>{data.title}</ItemTitle>
            <ItemDescription>
              {data.organizationName} ·{" "}
              {formatRange(new Date(data.startsAt), new Date(data.endsAt))}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              size="sm"
              disabled={join.isPending || !data.open || data.seatsLeft === 0}
              onClick={() => join.mutate(data.id)}
            >
              {join.isPending ? "Registering…" : "Register"}
            </Button>
          </ItemActions>
        </Item>
        {!data.open ? (
          <p className="text-muted-foreground text-sm">This event no longer takes people.</p>
        ) : data.seatsLeft === 0 ? (
          <p className="text-muted-foreground text-sm">Every seat is taken.</p>
        ) : null}
        <FormError error={join.error} />
      </div>
    ))
    .otherwise(() => null);
}
