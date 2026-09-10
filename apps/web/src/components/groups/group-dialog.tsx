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
import { Input } from "@absqir/ui/input";
import { Textarea } from "@absqir/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/shared/form-error";
import { type GroupValues, groupSchema } from "@/lib/directory-schemas";
import { useCreateGroup } from "@/mutations/use-create-group";
import { useUpdateGroup } from "@/mutations/use-update-group";
import type { Group } from "@/queries/use-groups";

export interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null creates, a group edits. */
  group: Pick<Group, "id" | "name" | "description"> | null;
}

function defaults(group: GroupDialogProps["group"]): GroupValues {
  return { name: group?.name ?? "", description: group?.description ?? "" };
}

export function GroupDialog(props: GroupDialogProps) {
  const editing = props.group !== null;
  const form = useForm<GroupValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: defaults(props.group),
  });

  const create = useCreateGroup();
  const update = useUpdateGroup();
  const pending = create.isPending || update.isPending;
  const saveLabel = editing ? "Save" : "Create";

  useEffect(() => {
    if (props.open) form.reset(defaults(props.group));
  }, [props.open, props.group, form]);

  const onSubmit = (values: GroupValues) => {
    const payload = { name: values.name, description: values.description || null };

    if (props.group) {
      update.mutate(
        { id: props.group.id, ...payload },
        { onSuccess: () => props.onOpenChange(false) },
      );
      return;
    }

    create.mutate(payload, { onSuccess: () => props.onOpenChange(false) });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit group" : "New group"}</DialogTitle>
          <DialogDescription>
            {editing ? "Rename it or change its description." : "Give it a name. Add people after."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              label="Name"
              render={(field) => (
                <Input
                  {...field}
                  id="group-name"
                  placeholder="Engineering, Batch 12, Volunteers"
                  autoFocus
                />
              )}
            />
            <FormField
              control={form.control}
              name="description"
              label="Description"
              description="Optional."
              render={(field) => <Textarea {...field} id="group-description" rows={3} />}
            />

            <FormError error={create.error ?? update.error} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : saveLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
