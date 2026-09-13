import { displayTimezone, formatDate } from "@absqir/core/date";
import { deviceTimezone } from "@absqir/core/timezone";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import { DatePicker, TimeField } from "@absqir/ui/date-picker";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@absqir/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@absqir/ui/toggle-group";
import { zodResolver } from "@hookform/resolvers/zod";
import { A, F, O, pipe } from "@mobily/ts-belt";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { GroupPicker } from "@/components/shared/group-picker";
import { PlacePicker } from "@/components/shared/place-picker";
import { type ScheduleValues, scheduleSchema } from "@/lib/event-schemas";
import { useCreateSchedule } from "@/mutations/use-create-schedule";
import { useUpdateSchedule } from "@/mutations/use-update-schedule";
import type { Schedule } from "@/queries/use-schedules";

export interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule | null;
}

/** Monday first, because a working week starts there. */
const WEEKDAYS = ["1", "2", "3", "4", "5", "6", "0"] as const;

/** "yyyy-MM-dd" → a local midnight, so the calendar shows the right day. */
function fromDay(value: string): Date {
  const [y, m, d] = A.map(value.split("-"), Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function defaults(schedule: Schedule | null): ScheduleValues {
  if (schedule) {
    return {
      title: schedule.title,
      description: schedule.description ?? "",
      frequency: schedule.frequency,
      weekdays: schedule.weekdays,
      startTime: schedule.startTime,
      durationMinutes: String(schedule.durationMinutes),
      lateAfterMinutes: String(schedule.lateAfterMinutes),
      opensBeforeMinutes: String(schedule.opensBeforeMinutes),
      startsOn: fromDay(schedule.startsOn),
      endsOn: match(schedule.endsOn)
        .with(P.string.minLength(1), (endsOn) => fromDay(endsOn))
        .otherwise(() => null),
      active: schedule.active,
      allowWalkIns: schedule.allowWalkIns,
      locationId: schedule.locationId ?? "",
      requireLocation: schedule.requireLocation,
      groupIds: pipe(
        schedule.groups,
        A.map((group) => group.id),
        F.toMutable,
      ),
    };
  }

  return {
    title: "",
    description: "",
    frequency: "weekly",
    weekdays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    durationMinutes: "60",
    lateAfterMinutes: "15",
    opensBeforeMinutes: "15",
    startsOn: new Date(),
    endsOn: null,
    active: true,
    allowWalkIns: false,
    locationId: "",
    requireLocation: false,
    groupIds: [],
  };
}

export function ScheduleDialog(props: ScheduleDialogProps) {
  const t = useTranslate();
  const editing = props.schedule !== null;
  const form = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema(t)),
    defaultValues: defaults(props.schedule),
  });

  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const pending = create.isPending || update.isPending;
  const saveLabel = match(editing)
    .with(true, () => t("common:actions.save"))
    .otherwise(() => t("schedules:dialog.create"));
  // A new rule starts in the zone the organizer reads times in.
  const timezone = props.schedule?.timezone ?? displayTimezone() ?? deviceTimezone();

  useEffect(() => {
    if (props.open) form.reset(defaults(props.schedule));
  }, [props.open, props.schedule, form]);

  const onSubmit = (values: ScheduleValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      frequency: values.frequency,
      weekdays: match(values.frequency)
        .with("weekly", () => values.weekdays)
        .otherwise(() => []),
      startTime: values.startTime,
      durationMinutes: Number(values.durationMinutes),
      lateAfterMinutes: Number(values.lateAfterMinutes),
      opensBeforeMinutes: Number(values.opensBeforeMinutes),
      timezone,
      startsOn: formatDate(values.startsOn, "iso"),
      endsOn: pipe(
        O.fromNullable(values.endsOn),
        O.map((endsOn) => formatDate(endsOn, "iso")),
        O.toNullable,
      ),
      active: values.active,
      allowWalkIns: values.allowWalkIns,
      locationId: values.locationId || null,
      // Without a place there is nothing to be outside of.
      requireLocation: values.requireLocation && values.locationId !== "",
      groupIds: values.groupIds,
    };

    if (props.schedule) {
      update.mutate(
        { id: props.schedule.id, ...payload },
        { onSuccess: () => props.onOpenChange(false) },
      );
      return;
    }

    create.mutate(payload, { onSuccess: () => props.onOpenChange(false) });
  };

  const frequency = form.watch("frequency");
  const weekdayError = form.formState.errors.weekdays;

  return (
    <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {match(editing)
              .with(true, () => t("schedules:dialog.editTitle"))
              .otherwise(() => t("schedules:dialog.newTitle"))}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("schedules:dialog.description", { timezone })}
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
                label={t("schedules:dialog.title")}
                render={(field) => (
                  <Input
                    {...field}
                    id="schedule-title"
                    placeholder={t("schedules:dialog.titlePlaceholder")}
                    autoFocus
                  />
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="schedule-frequency">
                    {t("schedules:dialog.repeats")}
                  </FieldLabel>
                  <FieldContent>
                    <Select
                      items={[
                        { value: "weekly", label: t("schedules:dialog.weekly") },
                        { value: "daily", label: t("schedules:dialog.daily") },
                      ]}
                      value={frequency}
                      onValueChange={(value) => {
                        if (value === "weekly" || value === "daily")
                          form.setValue("frequency", value);
                      }}
                    >
                      <SelectTrigger id="schedule-frequency" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="weekly">{t("schedules:dialog.weekly")}</SelectItem>
                          <SelectItem value="daily">{t("schedules:dialog.daily")}</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
                <FormField
                  control={form.control}
                  name="startTime"
                  label={t("schedules:dialog.startsAt")}
                  render={(field) => (
                    <TimeField
                      id="schedule-start-time"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              {match(frequency)
                .with("weekly", () => (
                  <Field
                    data-invalid={pipe(
                      O.fromNullable(weekdayError),
                      O.map(() => true as const),
                      O.toUndefined,
                    )}
                  >
                    <FieldLabel>{t("schedules:dialog.on")}</FieldLabel>
                    <FieldContent>
                      <ToggleGroup
                        multiple
                        value={A.map(form.watch("weekdays"), String)}
                        onValueChange={(value) =>
                          form.setValue("weekdays", pipe(value, A.map(Number), F.toMutable), {
                            shouldValidate: true,
                          })
                        }
                        variant="outline"
                        className="flex-wrap"
                      >
                        {A.map(WEEKDAYS, (day) => (
                          <ToggleGroupItem key={day} value={day}>
                            {t(`schedules:days.${day}`)}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      <FieldError errors={[weekdayError]} />
                    </FieldContent>
                  </Field>
                ))
                .otherwise(() => null)}

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  label={t("schedules:dialog.length")}
                  render={(field) => (
                    <Input
                      {...field}
                      id="schedule-duration"
                      type="number"
                      min={5}
                      inputMode="numeric"
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="lateAfterMinutes"
                  label={t("schedules:dialog.lateAfter")}
                  render={(field) => (
                    <Input
                      {...field}
                      id="schedule-late"
                      type="number"
                      min={0}
                      inputMode="numeric"
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="opensBeforeMinutes"
                  label={t("schedules:dialog.opensBefore")}
                  render={(field) => (
                    <Input
                      {...field}
                      id="schedule-opens"
                      type="number"
                      min={0}
                      inputMode="numeric"
                    />
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startsOn"
                  label={t("schedules:dialog.from")}
                  render={(field) => (
                    <DatePicker
                      id="schedule-starts-on"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="endsOn"
                  label={t("schedules:dialog.until")}
                  description={t("schedules:dialog.untilHint")}
                  render={(field) => (
                    <DatePicker
                      id="schedule-ends-on"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("schedules:dialog.noEnd")}
                    />
                  )}
                />
              </div>

              <Field>
                <FieldLabel>{t("schedules:dialog.expectedGroups")}</FieldLabel>
                <FieldContent>
                  <GroupPicker
                    value={form.watch("groupIds")}
                    onChange={(value) =>
                      form.setValue("groupIds", [...value], { shouldDirty: true })
                    }
                  />
                </FieldContent>
              </Field>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="schedule-active"
                    checked={form.watch("active")}
                    onCheckedChange={(checked) => form.setValue("active", checked === true)}
                  />
                  <Label htmlFor="schedule-active">{t("schedules:dialog.active")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="schedule-walk-ins"
                    checked={form.watch("allowWalkIns")}
                    onCheckedChange={(checked) => form.setValue("allowWalkIns", checked === true)}
                  />
                  <Label htmlFor="schedule-walk-ins">{t("schedules:dialog.walkIns")}</Label>
                </div>
              </div>

              {/* Every event this rule spawns inherits the place. Moving the
                  place later moves the events it has not spawned yet. */}
              <PlacePicker
                idPrefix="schedule"
                locationId={form.watch("locationId")}
                requireLocation={form.watch("requireLocation")}
                onChange={(value) => {
                  form.setValue("locationId", value.locationId, { shouldDirty: true });
                  form.setValue("requireLocation", value.requireLocation, { shouldDirty: true });
                }}
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
