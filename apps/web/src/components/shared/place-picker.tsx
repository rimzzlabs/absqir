import { Badge } from "@absqir/ui/badge";
import { Checkbox } from "@absqir/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@absqir/ui/field";
import { Label } from "@absqir/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemDescription,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@absqir/ui/select";
import { A } from "@mobily/ts-belt";
import { MapPinIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { useLocations } from "@/queries/use-locations";

/** The select needs a value for "no place", and an empty string is not one. */
const NONE = "none";

export interface PlacePickerProps {
  /** Empty means no place. */
  locationId: string;
  requireLocation: boolean;
  onChange: (value: { locationId: string; requireLocation: boolean }) => void;
  idPrefix: string;
}

/**
 * Picks the place an event or a schedule belongs to, and whether the
 * check-in is judged against it.
 *
 * The two are separate on purpose. A place with the check switched off still
 * tells a member where to go, and it costs nobody a permission prompt.
 */
export function PlacePicker(props: PlacePickerProps) {
  const places = useLocations();
  const rows = places.data ?? [];
  const chosen = match(props.locationId)
    .with("", () => NONE)
    .otherwise((id) => id);

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={`${props.idPrefix}-place`}>Place</FieldLabel>
        <FieldContent>
          <Select
            value={chosen}
            onValueChange={(value) =>
              // A cleared select reports null, which means the same as NONE.
              match(value)
                .with(NONE, null, () => props.onChange({ locationId: "", requireLocation: false }))
                .otherwise((locationId) =>
                  props.onChange({ locationId, requireLocation: props.requireLocation }),
                )
            }
          >
            <SelectTrigger id={`${props.idPrefix}-place`}>
              <SelectValue placeholder="No place" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Where people check in</SelectLabel>
                <SelectItem value={NONE}>
                  <span className="flex flex-col">
                    <span>No place</span>
                    <SelectItemDescription>
                      Anyone with the code checks in, wherever they are.
                    </SelectItemDescription>
                  </span>
                </SelectItem>
                {A.map(rows, (place) => (
                  <SelectItem key={place.id} value={place.id}>
                    <span className="flex flex-col">
                      <span>{place.name}</span>
                      <SelectItemDescription>
                        {match(place.address)
                          .with(P.string.minLength(1), (address) => `${address} · `)
                          .otherwise(() => "")}
                        within {place.radiusMeters} m
                      </SelectItemDescription>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {match(rows.length)
            .with(0, () => (
              <FieldDescription>
                <a href="/settings?tab=places" className="underline underline-offset-4">
                  Save a place first
                </a>{" "}
                to check where people are.
              </FieldDescription>
            ))
            .otherwise(() => null)}
        </FieldContent>
      </Field>

      {/* Without a place there is nothing to be outside of, so the switch
          only appears once one is picked. */}
      {match(props.locationId)
        .with(P.string.minLength(1), () => (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${props.idPrefix}-require-location`}
                checked={props.requireLocation}
                onCheckedChange={(checked) =>
                  props.onChange({
                    locationId: props.locationId,
                    requireLocation: checked === true,
                  })
                }
              />
              <Label
                htmlFor={`${props.idPrefix}-require-location`}
                className="flex flex-wrap items-center gap-1.5"
              >
                <MapPinIcon className="size-4" />
                Refuse a check-in made outside this place
                <Badge variant="outline">Experimental</Badge>
              </Label>
            </div>

            {match(props.requireLocation)
              .with(true, () => (
                <p className="text-muted-foreground pl-6 text-xs">
                  Each member's browser asks for their location. A reading outside the circle is
                  refused, and one that looks made up is accepted and flagged for you. The code on
                  the room screen is still what proves they were there. A flag is a reason to look,
                  not a verdict.
                </p>
              ))
              .otherwise(() => null)}
          </div>
        ))
        .otherwise(() => null)}
    </div>
  );
}
