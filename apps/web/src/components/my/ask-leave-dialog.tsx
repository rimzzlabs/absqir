import { formatRange } from "@absqir/core/date";
import { Button } from "@absqir/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@absqir/ui/dialog";
import { Form, FormField } from "@absqir/ui/form";
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
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/shared/form-error";
import { type AskLeaveValues, askLeaveSchema } from "@/lib/leave-schemas";
import { useAskLeave } from "@/mutations/use-ask-leave";
import { useMyLeave } from "@/queries/use-leave";
import { useMySessions } from "@/queries/use-my";

export interface AskLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Enough rows to offer every event still ahead without a second page. */
const CHOICES = 50;

export function AskLeaveDialog(props: AskLeaveDialogProps) {
  const sessions = useMySessions({ scope: "upcoming", limit: CHOICES });
  const mine = useMyLeave({ scope: "all", limit: CHOICES });
  const ask = useAskLeave();
  const form = useForm<AskLeaveValues>({
    resolver: zodResolver(askLeaveSchema),
    defaultValues: { sessionId: "", reason: "" },
  });

  useEffect(() => {
    if (props.open) form.reset({ sessionId: "", reason: "" });
  }, [props.open, form]);

  // Only events still ahead, without a record, and without a request already.
  const asked = new Set(
    (mine.data?.pages ?? []).flatMap((page) => page.items).map((row) => row.sessionId),
  );
  const options = (sessions.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((session) => session.status !== "done" && !session.record && !asked.has(session.id))
    .map((session) => ({
      value: session.id,
      label: session.title,
      hint: formatRange(new Date(session.startsAt), new Date(session.endsAt)),
    }));

  const onSubmit = (values: AskLeaveValues) => {
    ask.mutate(values, { onSuccess: () => props.onOpenChange(false) });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask for leave</DialogTitle>
          <DialogDescription>
            An organizer decides. If approved, the event shows you as excused.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="sessionId"
              label="Event"
              render={(field) => (
                <Select
                  items={options.map((option) => ({ value: option.value, label: option.label }))}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger id="leave-session" className="w-full">
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
                        options.map((option) => (
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={ask.isPending}>
                {ask.isPending ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
