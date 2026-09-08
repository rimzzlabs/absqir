import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@absqir/ui/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@absqir/ui/field";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { Textarea } from "@absqir/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/shared/form-error";
import { GroupPicker } from "@/components/shared/group-picker";
import {
  fromLocalInput,
  type SessionValues,
  sessionSchema,
  toLocalInput,
} from "@/lib/session-schemas";
import { useCreateSession } from "@/mutations/use-create-session";
import { useUpdateSession } from "@/mutations/use-update-session";
import type { Session } from "@/queries/use-sessions";

export interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null creates, a session edits. */
  session: Session | null;
}

const HOUR_MS = 60 * 60 * 1000;

function nextRoundHour(): Date {
  const date = new Date(Date.now() + HOUR_MS);
  date.setMinutes(0, 0, 0);
  return date;
}

function defaults(session: Session | null): SessionValues {
  if (session) {
    return {
      title: session.title,
      description: session.description ?? "",
      startsAt: toLocalInput(session.startsAt),
      endsAt: toLocalInput(session.endsAt),
      lateAfterMinutes: String(session.lateAfterMinutes),
      opensBeforeMinutes: String(session.opensBeforeMinutes),
      allowWalkIns: session.allowWalkIns,
      groupIds: session.groups.map((group) => group.id),
    };
  }

  const start = nextRoundHour();

  return {
    title: "",
    description: "",
    startsAt: toLocalInput(start.toISOString()),
    endsAt: toLocalInput(new Date(start.getTime() + HOUR_MS).toISOString()),
    lateAfterMinutes: "15",
    opensBeforeMinutes: "15",
    allowWalkIns: false,
    groupIds: [],
  };
}

export function SessionDialog(props: SessionDialogProps) {
  const editing = props.session !== null;
  const form = useForm<SessionValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: defaults(props.session),
  });

  const create = useCreateSession();
  const update = useUpdateSession();
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (props.open) form.reset(defaults(props.session));
  }, [props.open, props.session, form]);

  const onSubmit = (values: SessionValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      startsAt: fromLocalInput(values.startsAt),
      endsAt: fromLocalInput(values.endsAt),
      lateAfterMinutes: Number(values.lateAfterMinutes),
      opensBeforeMinutes: Number(values.opensBeforeMinutes),
      allowWalkIns: values.allowWalkIns,
      groupIds: values.groupIds,
    };

    if (props.session) {
      update.mutate(
        { id: props.session.id, ...payload },
        { onSuccess: () => props.onOpenChange(false) },
      );
      return;
    }

    create.mutate(payload, { onSuccess: () => props.onOpenChange(false) });
  };

  const groupError = form.formState.errors.groupIds;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit session" : "New session"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Times and groups can change until the session closes."
              : "One moment people are expected. Everyone in the ticked groups is on the list."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="title"
              label="Title"
              render={(field) => (
                <Input {...field} id="session-title" placeholder="Monday standup" autoFocus />
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startsAt"
                label="Starts"
                render={(field) => <Input {...field} id="session-starts" type="datetime-local" />}
              />
              <FormField
                control={form.control}
                name="endsAt"
                label="Ends"
                render={(field) => <Input {...field} id="session-ends" type="datetime-local" />}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="lateAfterMinutes"
                label="Late after (minutes)"
                description="A check-in later than this after the start counts as late."
                render={(field) => (
                  <Input {...field} id="session-late" type="number" min={0} inputMode="numeric" />
                )}
              />
              <FormField
                control={form.control}
                name="opensBeforeMinutes"
                label="Opens before (minutes)"
                description="Check-in opens this long before the start."
                render={(field) => (
                  <Input {...field} id="session-opens" type="number" min={0} inputMode="numeric" />
                )}
              />
            </div>

            <Field data-invalid={groupError ? true : undefined}>
              <FieldLabel>Expected groups</FieldLabel>
              <FieldContent>
                <GroupPicker
                  value={form.watch("groupIds")}
                  onChange={(value) => form.setValue("groupIds", value, { shouldDirty: true })}
                />
                <FieldError errors={[groupError]} />
              </FieldContent>
            </Field>

            <div className="flex items-center gap-2">
              <Checkbox
                id="session-walk-ins"
                checked={form.watch("allowWalkIns")}
                onCheckedChange={(checked) => form.setValue("allowWalkIns", checked === true)}
              />
              <Label htmlFor="session-walk-ins">
                Let members outside these groups check in too
              </Label>
            </div>

            <FormField
              control={form.control}
              name="description"
              label="Notes"
              description="Optional. Room, agenda, what to bring."
              render={(field) => <Textarea {...field} id="session-description" rows={2} />}
            />

            <FormError error={create.error ?? update.error} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
