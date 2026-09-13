import { DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS, MIN_RADIUS_METERS } from "@absqir/core/geo";
import { Button } from "@absqir/ui/button";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@absqir/ui/responsive-dialog";
import { useEffect, useState } from "react";
import { match } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { clampRadius, isPlaced, MapPicker } from "@/components/shared/map-picker";
import { useCreatePlace, useUpdatePlace } from "@/mutations/use-location-actions";
import type { Place } from "@/queries/use-locations";

export interface PlaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null creates, a place edits. */
  place: Place | null;
}

interface Draft {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

function defaults(place: Place | null): Draft {
  return {
    name: place?.name ?? "",
    address: place?.address ?? "",
    latitude: place?.latitude ?? 0,
    longitude: place?.longitude ?? 0,
    radiusMeters: place?.radiusMeters ?? DEFAULT_RADIUS_METERS,
  };
}

export function PlaceDialog(props: PlaceDialogProps) {
  const editing = props.place !== null;
  const [draft, setDraft] = useState<Draft>(() => defaults(props.place));

  const create = useCreatePlace();
  const update = useUpdatePlace();
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (props.open) setDraft(defaults(props.place));
  }, [props.open, props.place]);

  const placed = isPlaced(draft);
  const named = draft.name.trim().length > 0;

  const submit = () => {
    const payload = {
      name: draft.name.trim(),
      address: draft.address.trim() || null,
      latitude: draft.latitude,
      longitude: draft.longitude,
      radiusMeters: clampRadius(draft.radiusMeters),
    };
    const done = { onSuccess: () => props.onOpenChange(false) };

    match(props.place)
      .with(null, () => create.mutate(payload, done))
      .otherwise((place) => update.mutate({ id: place.id, ...payload }, done));
  };

  return (
    <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {match(editing)
              .with(true, () => "Edit place" as const)
              .otherwise(() => "New place" as const)}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            An event set to this place accepts a check-in inside the circle, and refuses one outside
            it.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (placed && named) submit();
          }}
          className="flex min-h-0 flex-1 flex-col gap-4"
          noValidate
        >
          <ResponsiveDialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="place-name">Name</Label>
              <Input
                id="place-name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Head office, Hall B, Site 3"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="place-address">Address</Label>
              <Input
                id="place-address"
                value={draft.address}
                onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                placeholder="Optional. For the reader, nothing is looked up from it."
              />
            </div>

            <MapPicker value={draft} onChange={(value) => setDraft({ ...draft, ...value })} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="place-radius">How far from the pin a check-in still counts</Label>
              <div className="flex items-center gap-3">
                <input
                  id="place-radius"
                  type="range"
                  min={MIN_RADIUS_METERS}
                  max={1000}
                  step={5}
                  value={Math.min(1000, draft.radiusMeters)}
                  onChange={(event) =>
                    setDraft({ ...draft, radiusMeters: Number(event.target.value) })
                  }
                  className="accent-primary h-2 flex-1"
                />
                <Input
                  aria-label="Radius in metres"
                  type="number"
                  inputMode="numeric"
                  min={MIN_RADIUS_METERS}
                  max={MAX_RADIUS_METERS}
                  value={draft.radiusMeters}
                  onChange={(event) =>
                    setDraft({ ...draft, radiusMeters: Number(event.target.value) })
                  }
                  className="w-24 tabular-nums"
                />
                <span className="text-muted-foreground text-sm">m</span>
              </div>
              <p className="text-muted-foreground text-xs">
                A phone is accurate to about ten metres outdoors, and far less indoors. Under{" "}
                {MIN_RADIUS_METERS} m the circle is smaller than the error, so it is the floor.
              </p>
            </div>

            {/* The pin, not the name, is what the fence is made of. */}
            {match(placed)
              .with(false, () => (
                <p className="text-muted-foreground text-sm">
                  Tap the map to put the pin down, or press <b>Use my location</b>.
                </p>
              ))
              .otherwise(() => null)}

            <FormError error={create.error ?? update.error} />
          </ResponsiveDialogBody>

          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !placed || !named}>
              {match(pending)
                .with(true, () => "Saving…" as const)
                .otherwise(() =>
                  match(editing)
                    .with(true, () => "Save" as const)
                    .otherwise(() => "Create" as const),
                )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
