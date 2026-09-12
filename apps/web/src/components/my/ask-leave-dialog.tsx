import { formatRange } from "@absqir/core/date";
import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
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
  SelectItemDescription,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@absqir/ui/select";
import { Textarea } from "@absqir/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { A, pipe } from "@mobily/ts-belt";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/shared/form-error";
import { type AskLeaveValues, askLeaveSchema } from "@/lib/leave-schemas";
import { useAskLeave } from "@/mutations/use-ask-leave";
import { useMyLeave } from "@/queries/use-leave";
import { type MyEvent, useMyEvents } from "@/queries/use-my";

export type AskLeaveTarget = Pick<MyEvent, "id" | "title" | "startsAt" | "endsAt">;

export interface AskLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** An event chosen before the dialog opened. The picker stays hidden. */
  event?: AskLeaveTarget | null;
}

/** Enough rows to offer every event still ahead without a second page. */
const CHOICES = 50;

export function AskLeaveDialog(props: AskLeaveDialogProps) {
  const events = useMyEvents({ scope: "upcoming", limit: CHOICES });
  const mine = useMyLeave({ scope: "all", limit: CHOICES });
  const ask = useAskLeave();
  const form = useForm<AskLeaveValues>({
    resolver: zodResolver(askLeaveSchema),
    defaultValues: { eventId: "", reason: "" },
  });

  const preset = props.event ?? null;

  useEffect(() => {
    if (props.open) form.reset({ eventId: preset?.id ?? "", reason: "" });
  }, [props.open, preset, form]);

  // Only events still ahead, without a record, and without a request already.
  const asked = new Set(
    pipe(
      mine.data?.pages ?? [],
      A.flatMap((page) => page.items),
      A.map((row) => row.eventId),
    ),
  );
  const options = pipe(
    events.data?.pages ?? [],
    A.flatMap((page) => page.items),
    A.filter((event) => event.status !== "done" && !event.record && !asked.has(event.id)),
    A.map((event) => ({
      value: event.id,
      label: event.title,
      hint: formatRange(new Date(event.startsAt), new Date(event.endsAt)),
    })),
  );

  const onSubmit = (values: AskLeaveValues) => {
    ask.mutate(values, { onSuccess: () => props.onOpenChange(false) });
  };

  return (
    <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Ask for leave</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            An organizer decides. If approved, the event shows you as excused.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-4"
            noValidate
          >
            <ResponsiveDialogBody>
              {preset ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Event</p>
                  <div className="bg-muted/50 ring-foreground/10 rounded-lg px-3 py-2 ring-1">
                    <p className="text-sm font-medium">{preset.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatRange(new Date(preset.startsAt), new Date(preset.endsAt))}
                    </p>
                  </div>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="eventId"
                  label="Event"
                  render={(field) => (
                    <Select
                      items={A.map(options, (option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <SelectTrigger id="leave-event" className="w-full">
                        <SelectValue placeholder="Pick an event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Upcoming events</SelectLabel>
                          {options.length === 0 ? (
                            <p className="text-muted-foreground px-1.5 py-1 text-sm">
                              Nothing ahead of you to ask about.
                            </p>
                          ) : (
                            A.map(options, (option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <span className="flex flex-col">
                                  <span>{option.label}</span>
                                  <SelectItemDescription>{option.hint}</SelectItemDescription>
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="reason"
                label="Reason"
                render={(field) => (
                  <Textarea
                    {...field}
                    id="leave-reason"
                    rows={3}
                    placeholder="Doctor's appointment"
                  />
                )}
              />
              <FormError error={ask.error} />
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={ask.isPending}>
                {ask.isPending ? "Sending…" : "Send"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
