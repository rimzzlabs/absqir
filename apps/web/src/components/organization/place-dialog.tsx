import { DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS, MIN_RADIUS_METERS } from "@absqir/core/geo";
import { useTranslate } from "@absqir/i18n/react";
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
  const t = useTranslate();
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
      <ResponsiveDialogContent className="sm:max-w-3xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {match(editing)
              .with(true, () => t("organization:places.dialog.editTitle"))
              .otherwise(() => t("organization:places.dialog.newTitle"))}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("organization:places.dialog.description")}
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
          {/*
            One column on a phone, in the order the organizer works: the name,
            the pin, then the radius that the map above already draws. Above md
            the map moves to a column of its own, where it is big enough to
            drop a pin without ten zooms, and the fields stack beside it.
          */}
          <ResponsiveDialogBody className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-6">
            <div className="flex flex-col gap-4 md:col-start-1 md:row-start-1">
              <div className="flex flex-col gap-2">
                <Label htmlFor="place-name">{t("organization:places.dialog.name")}</Label>
                <Input
                  id="place-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder={t("organization:places.dialog.namePlaceholder")}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="place-address">{t("organization:places.dialog.address")}</Label>
                <Input
                  id="place-address"
                  value={draft.address}
                  onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                  placeholder={t("organization:places.dialog.addressPlaceholder")}
                />
              </div>
            </div>

            <div className="md:col-start-2 md:row-span-2 md:row-start-1">
              {/* The height follows the window on a laptop, so a taller screen
                  gives a bigger map instead of the same small square. */}
              <MapPicker
                value={draft}
                onChange={(value) => setDraft({ ...draft, ...value })}
                className="md:h-[min(60vh,28rem)]"
              />
            </div>

            <div className="flex flex-col gap-4 md:col-start-1 md:row-start-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="place-radius">{t("organization:places.dialog.radius")}</Label>
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
                    aria-label={t("organization:places.dialog.radiusLabel")}
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
                  <span className="text-muted-foreground text-sm">
                    {t("organization:places.dialog.metres")}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {t("organization:places.dialog.radiusHint", { count: MIN_RADIUS_METERS })}
                </p>
              </div>

              {/* The pin, not the name, is what the fence is made of. */}
              {match(placed)
                .with(false, () => (
                  <p className="text-muted-foreground text-sm">
                    {t("organization:places.dialog.placeHintBefore")}{" "}
                    <b>{t("organization:places.dialog.placeHintButton")}</b>.
                  </p>
                ))
                .otherwise(() => null)}

              <FormError error={create.error ?? update.error} />
            </div>
          </ResponsiveDialogBody>

          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending || !placed || !named}>
              {match(pending)
                .with(true, () => t("common:actions.saving"))
                .otherwise(() =>
                  match(editing)
                    .with(true, () => t("common:actions.save"))
                    .otherwise(() => t("organization:places.dialog.create")),
                )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
