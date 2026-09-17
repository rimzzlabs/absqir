import { formatRange } from "@absqir/core/date";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@absqir/ui/item";
import { Skeleton } from "@absqir/ui/skeleton";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { QueryError } from "@/components/shared/query-error";
import { useOnboardingEvent } from "@/mutations/use-onboarding-event";
import { usePublicEvent } from "@/queries/use-public-event";

export interface OnboardingEventCardProps {
  eventId: string;
}

/** Step 3 through a public event page: one card, one button. */
export function OnboardingEventCard(props: OnboardingEventCardProps) {
  const t = useTranslate();
  const event = usePublicEvent(props.eventId);
  const join = useOnboardingEvent();

  return match(event)
    .with({ isPending: true }, () => <Skeleton className="h-20 rounded-xl" />)
    .with({ isError: true }, () => <QueryError query={event} />)
    .with({ data: P.select(P.nonNullable) }, (data) => {
      const soldOut = match(data.seatsLeft)
        .with(0, () => t("onboarding:event.soldOut"))
        .otherwise(() => null);
      const note = match(data.open)
        .with(true, () => soldOut)
        .otherwise(() => t("onboarding:event.closed"));

      return (
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
                {match(join.isPending)
                  .with(true, () => t("onboarding:event.registering"))
                  .otherwise(() => t("onboarding:event.register"))}
              </Button>
            </ItemActions>
          </Item>
          {match(note)
            .with(P.string.minLength(1), (note) => (
              <p className="text-muted-foreground text-sm">{note}</p>
            ))
            .otherwise(() => null)}
          <FormError error={join.error} />
        </div>
      );
    })
    .otherwise(() => null);
}
