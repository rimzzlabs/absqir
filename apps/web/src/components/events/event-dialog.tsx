import { inDisplayZone } from "@absqir/core/date";
import { useTranslate } from "@absqir/i18n/react";
import { Alert, AlertDescription, AlertTitle } from "@absqir/ui/alert";
import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import { DateTimePicker } from "@absqir/ui/date-picker";
import { Field, FieldContent, FieldError, FieldLabel } from "@absqir/ui/field";
import { Form, FormField } from "@absqir/ui/form";
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
import { Textarea } from "@absqir/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { A, F, O, pipe } from "@mobily/ts-belt";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { GroupPicker } from "@/components/shared/group-picker";
import { PlacePicker } from "@/components/shared/place-picker";
import { type EventValues, eventSchema } from "@/lib/event-schemas";
import { useCreateEvent } from "@/mutations/use-create-event";
import { useUpdateEvent } from "@/mutations/use-update-event";
import type { Event } from "@/queries/use-events";

export interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null creates, an event edits. */
  event: Event | null;
  /** The day a new event starts on, when the calendar opened the dialog. */
  initialStart?: Date | null;
}

const HOUR_MS = 60 * 60 * 1000;

function nextRoundHour(): Date {
  const date = new Date(Date.now() + HOUR_MS);
  date.setMinutes(0, 0, 0);
  return date;
}

/** Nine in the morning on the given day, in the display zone. */
function morningOf(day: Date): Date {
  const start = inDisplayZone(day);
  start.setHours(9, 0, 0, 0);

  return new Date(start.getTime());
}

function defaults(event: Event | null, initialStart?: Date | null): EventValues {
  if (event) {
    return {
      title: event.title,
      description: event.description ?? "",
      startsAt: new Date(event.startsAt),
      endsAt: new Date(event.endsAt),
      lateAfterMinutes: String(event.lateAfterMinutes),
      opensBeforeMinutes: String(event.opensBeforeMinutes),
      allowWalkIns: event.allowWalkIns,
      registrationOpen: event.registrationOpen,
      registrationLimit: match(event.registrationLimit)
        .with(null, () => "")
        .otherwise((registrationLimit) => String(registrationLimit)),
      locationId: event.fence?.locationId ?? "",
      requireLocation: event.requireLocation,
      groupIds: pipe(
        event.groups,
        A.map((group) => group.id),
        F.toMutable,
      ),
    };
  }

  const start = match(initialStart)
    .with(P.nullish, () => nextRoundHour())
    .otherwise((initialStart) => morningOf(initialStart));

  return {
    title: "",
    description: "",
    startsAt: start,
    endsAt: new Date(start.getTime() + HOUR_MS),
    lateAfterMinutes: "15",
    opensBeforeMinutes: "15",
    allowWalkIns: false,
    registrationOpen: false,
    registrationLimit: "",
    locationId: "",
    requireLocation: false,
    groupIds: [],
  };
}

export function EventDialog(props: EventDialogProps) {
  const t = useTranslate();
  const editing = props.event !== null;
  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema(t)),
    defaultValues: defaults(props.event, props.initialStart),
  });

  const create = useCreateEvent();
  const update = useUpdateEvent();
  const pending = create.isPending || update.isPending;
  const saveLabel = match(editing)
    .with(true, () => t("common:actions.save"))
    .otherwise(() => t("events:dialog.create"));

  useEffect(() => {
    if (props.open) form.reset(defaults(props.event, props.initialStart));
  }, [props.open, props.event, props.initialStart, form]);

  const onSubmit = (values: EventValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      startsAt: values.startsAt.toISOString(),
      endsAt: values.endsAt.toISOString(),
      lateAfterMinutes: Number(values.lateAfterMinutes),
      opensBeforeMinutes: Number(values.opensBeforeMinutes),
      allowWalkIns: values.allowWalkIns,
      registrationOpen: values.registrationOpen,
      registrationLimit: match(values.registrationOpen && values.registrationLimit !== "")
        .with(true, () => Number(values.registrationLimit))
        .otherwise(() => null),
      locationId: values.locationId || null,
      // Without a place there is nothing to be outside of.
      requireLocation: values.requireLocation && values.locationId !== "",
      groupIds: values.groupIds,
    };

    if (props.event) {
      update.mutate(
        { id: props.event.id, ...payload },
        { onSuccess: () => props.onOpenChange(false) },
      );
      return;
    }

    create.mutate(payload, { onSuccess: () => props.onOpenChange(false) });
  };

  const groupError = form.formState.errors.groupIds;
  // A done event always ends in the past; only an event still ahead of
  // its close needs the warning.
  const backfill =
    (props.event === null || props.event.status !== "done") && form.watch("endsAt") <= new Date();

  return (
    <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {match(editing)
              .with(true, () => t("events:dialog.editTitle"))
              .otherwise(() => t("events:dialog.newTitle"))}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {match(editing)
              .with(true, () => t("events:dialog.editDescription"))
              .otherwise(() => t("events:dialog.newDescription"))}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-4"
            noValidate
          >
            <ResponsiveDialogBody>
              <FormField
                control={form.control}
                name="title"
                label={t("events:dialog.title")}
                render={(field) => (
                  <Input
                    {...field}
                    id="event-title"
                    placeholder={t("events:dialog.titlePlaceholder")}
                    autoFocus
                  />
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startsAt"
                  label={t("events:dialog.starts")}
                  render={(field) => (
                    <DateTimePicker
                      id="event-starts"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="endsAt"
                  label={t("events:dialog.ends")}
                  render={(field) => (
                    <DateTimePicker id="event-ends" value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>

              {match(backfill)
                .with(true, () => (
                  <Alert>
                    <ClockCounterClockwiseIcon />
                    <AlertTitle>{t("events:dialog.backfillTitle")}</AlertTitle>
                    <AlertDescription>
                      {match(editing)
                        .with(true, () => t("events:dialog.backfillEdit"))
                        .otherwise(() => t("events:dialog.backfillNew"))}
                    </AlertDescription>
                  </Alert>
                ))
                .otherwise(() => null)}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="lateAfterMinutes"
                  label={t("events:dialog.lateAfter")}
                  description={t("events:dialog.lateAfterHint")}
                  render={(field) => (
                    <Input {...field} id="event-late" type="number" min={0} inputMode="numeric" />
                  )}
                />
                <FormField
                  control={form.control}
                  name="opensBeforeMinutes"
                  label={t("events:dialog.opensBefore")}
                  description={t("events:dialog.opensBeforeHint")}
                  render={(field) => (
                    <Input {...field} id="event-opens" type="number" min={0} inputMode="numeric" />
                  )}
                />
              </div>

              <Field
                data-invalid={pipe(
                  O.fromNullable(groupError),
                  O.map(() => true as const),
                  O.toUndefined,
                )}
              >
                <FieldLabel>{t("events:dialog.expectedGroups")}</FieldLabel>
                <FieldContent>
                  <GroupPicker
                    value={form.watch("groupIds")}
                    onChange={(value) =>
                      form.setValue("groupIds", [...value], { shouldDirty: true })
                    }
                  />
                  <FieldError errors={[groupError]} />
                </FieldContent>
              </Field>

              <PlacePicker
                idPrefix="event"
                locationId={form.watch("locationId")}
                requireLocation={form.watch("requireLocation")}
                onChange={(value) => {
                  form.setValue("locationId", value.locationId, { shouldDirty: true });
                  form.setValue("requireLocation", value.requireLocation, { shouldDirty: true });
                }}
              />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="event-walk-ins"
                  checked={form.watch("allowWalkIns")}
                  onCheckedChange={(checked) => form.setValue("allowWalkIns", checked === true)}
                />
                <Label htmlFor="event-walk-ins">{t("events:dialog.walkIns")}</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="event-registration"
                  checked={form.watch("registrationOpen")}
                  onCheckedChange={(checked) =>
                    form.setValue("registrationOpen", checked === true, { shouldDirty: true })
                  }
                />
                <Label htmlFor="event-registration">{t("events:dialog.registration")}</Label>
              </div>

              {match(form.watch("registrationOpen"))
                .with(true, () => (
                  <FormField
                    control={form.control}
                    name="registrationLimit"
                    label={t("events:dialog.seats")}
                    description={t("events:dialog.seatsHint")}
                    render={(field) => (
                      <Input
                        {...field}
                        id="event-seats"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        placeholder={t("events:dialog.seatsPlaceholder")}
                      />
                    )}
                  />
                ))
                .otherwise(() => null)}

              <FormField
                control={form.control}
                name="description"
                label={t("events:dialog.notes")}
                description={t("events:dialog.notesHint")}
                render={(field) => <Textarea {...field} id="event-description" rows={2} />}
              />

              <FormError error={create.error ?? update.error} />
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                {t("common:actions.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {match(pending)
                  .with(true, () => t("common:actions.saving"))
                  .otherwise(() => saveLabel)}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
