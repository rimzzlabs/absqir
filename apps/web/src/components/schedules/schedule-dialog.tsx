import { displayTimezone, formatDate } from "@absqir/core/date";
import { deviceTimezone } from "@absqir/core/timezone";
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
import { A, F, pipe } from "@mobily/ts-belt";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/shared/form-error";
import { GroupPicker } from "@/components/shared/group-picker";
import { type ScheduleValues, scheduleSchema } from "@/lib/event-schemas";
import { useCreateSchedule } from "@/mutations/use-create-schedule";
import { useUpdateSchedule } from "@/mutations/use-update-schedule";
import type { Schedule } from "@/queries/use-schedules";

export interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule | null;
}

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

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
      endsOn: schedule.endsOn ? fromDay(schedule.endsOn) : null,
      active: schedule.active,
      allowWalkIns: schedule.allowWalkIns,
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
    groupIds: [],
  };
}

export function ScheduleDialog(props: ScheduleDialogProps) {
  const editing = props.schedule !== null;
  const form = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: defaults(props.schedule),
  });

  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const pending = create.isPending || update.isPending;
  const saveLabel = editing ? "Save" : "Create";
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
      weekdays: values.frequency === "weekly" ? values.weekdays : [],
      startTime: values.startTime,
      durationMinutes: Number(values.durationMinutes),
      lateAfterMinutes: Number(values.lateAfterMinutes),
      opensBeforeMinutes: Number(values.opensBeforeMinutes),
      timezone,
      startsOn: formatDate(values.startsOn, "iso"),
      endsOn: values.endsOn ? formatDate(values.endsOn, "iso") : null,
      active: values.active,
      allowWalkIns: values.allowWalkIns,
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
            {editing ? "Edit schedule" : "New schedule"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            A rule that creates events on its own, two weeks ahead. Times are in {timezone}.
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
                label="Title"
                render={(field) => (
                  <Input {...field} id="schedule-title" placeholder="Morning shift" autoFocus />
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="schedule-frequency">Repeats</FieldLabel>
                  <FieldContent>
                    <Select
                      items={[
                        { value: "weekly", label: "Weekly, on chosen days" },
                        { value: "daily", label: "Every day" },
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
                          <SelectItem value="weekly">Weekly, on chosen days</SelectItem>
                          <SelectItem value="daily">Every day</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
                <FormField
                  control={form.control}
                  name="startTime"
                  label="Starts at"
                  render={(field) => (
                    <TimeField
                      id="schedule-start-time"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              {frequency === "weekly" ? (
                <Field data-invalid={weekdayError ? true : undefined}>
                  <FieldLabel>On</FieldLabel>
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
                        <ToggleGroupItem key={day.value} value={String(day.value)}>
                          {day.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <FieldError errors={[weekdayError]} />
                  </FieldContent>
                </Field>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  label="Length (min)"
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
                  label="Late after (min)"
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
                  label="Opens before (min)"
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
                  label="From"
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
                  label="Until"
                  description="Leave empty to keep going."
                  render={(field) => (
                    <DatePicker
                      id="schedule-ends-on"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="No end"
                    />
                  )}
                />
              </div>

              <Field>
                <FieldLabel>Expected groups</FieldLabel>
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
                  <Label htmlFor="schedule-active">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="schedule-walk-ins"
                    checked={form.watch("allowWalkIns")}
                    onCheckedChange={(checked) => form.setValue("allowWalkIns", checked === true)}
                  />
                  <Label htmlFor="schedule-walk-ins">Allow walk-ins</Label>
                </div>
              </div>

              <FormError error={create.error ?? update.error} />
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : saveLabel}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
