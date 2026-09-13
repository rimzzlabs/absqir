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
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { IconAction } from "@absqir/ui/icon-action";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { MapPinIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { PlaceDialog } from "@/components/settings/place-dialog";
import { FormError } from "@/components/shared/form-error";
import { useRemovePlace } from "@/mutations/use-location-actions";
import { type Place, useLocations } from "@/queries/use-locations";

/** "2 events, 1 schedule", or an empty string when nothing points here. */
function usage(place: Place): string {
  const parts = [
    match(place.eventCount)
      .with(0, () => null)
      .with(1, () => "1 event")
      .otherwise((count) => `${count} events`),
    match(place.scheduleCount)
      .with(0, () => null)
      .with(1, () => "1 schedule")
      .otherwise((count) => `${count} schedules`),
  ];

  return A.filter(parts, (part): part is string => part !== null).join(", ");
}

function PlaceRow(props: { place: Place; onEdit: () => void; onDelete: () => void }) {
  const { place } = props;
  const inUse = usage(place);

  return (
    <div className="border-border flex flex-wrap items-start gap-3 border-b py-4 last:border-b-0">
      <MapPinIcon className="text-muted-foreground mt-1 size-5 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{place.name}</p>
          <Badge variant="outline" className="tabular-nums">
            {place.radiusMeters} m
          </Badge>
        </div>

        {match(place.address)
          .with(P.string.minLength(1), (address) => (
            <p className="text-muted-foreground text-sm">{address}</p>
          ))
          .otherwise(() => null)}

        <p className="text-muted-foreground mt-1 text-xs tabular-nums">
          {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
          {match(inUse)
            .with("", () => null)
            .otherwise((text) => ` · ${text}`)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <IconAction label={`Edit ${place.name}`} onClick={props.onEdit}>
          <PencilSimpleIcon />
        </IconAction>
        <IconAction label={`Delete ${place.name}`} onClick={props.onDelete}>
          <TrashIcon />
        </IconAction>
      </div>
    </div>
  );
}

/**
 * The places an organization checks people in at. An event or a schedule
 * points at one, and the event keeps a copy of the circle, so moving a place
 * here never changes what an old check-in was judged against.
 */
export function PlacesPanel() {
  const places = useLocations();
  const remove = useRemovePlace();
  const [editing, setEditing] = useState<Place | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Place | null>(null);

  const rows = places.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <PlusIcon />
          New place
        </Button>
      </div>

      <FormError error={places.error ?? remove.error} />

      {match({ pending: places.isPending, count: rows.length })
        .with({ pending: true }, () => (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))
        .with({ count: 0 }, () => (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPinIcon />
              </EmptyMedia>
              <EmptyTitle>No places yet</EmptyTitle>
              <EmptyDescription>
                Save the office, the hall, or the site. Then an event can refuse a check-in made
                somewhere else.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ))
        .otherwise(() => (
          <div>
            {A.map(rows, (place) => (
              <PlaceRow
                key={place.id}
                place={place}
                onEdit={() => {
                  setEditing(place);
                  setOpen(true);
                }}
                onDelete={() => setDeleting(place)}
              />
            ))}
          </div>
        ))}

      <PlaceDialog open={open} onOpenChange={setOpen} place={editing} />

      {/* Deleting a place damages nothing: every event that used it kept its
          own copy of the circle. One plain confirmation is enough. */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) =>
          match(next)
            .with(false, () => setDeleting(null))
            .otherwise(() => {})
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {match(deleting)
                .with(P.nonNullable, (place) =>
                  match(usage(place))
                    .with("", () => "Nothing points at it yet.")
                    .otherwise(
                      (text) =>
                        `${text} point at it. Events already made keep their own copy of the circle, so no past check-in changes meaning. Future events from a schedule lose the fence.`,
                    ),
                )
                .otherwise(() => "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                match(deleting)
                  .with(P.nonNullable, (place) =>
                    remove.mutate(place.id, { onSuccess: () => setDeleting(null) }),
                  )
                  .otherwise(() => {});
              }}
            >
              {match(remove.isPending)
                .with(true, () => "Deleting…" as const)
                .otherwise(() => "Delete place" as const)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
