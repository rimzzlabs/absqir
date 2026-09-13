import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
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
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { match } from "ts-pattern";
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
  const saveLabel = match(editing)
    .with(true, () => "Save" as const)
    .otherwise(() => "Create" as const);

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
    <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {match(editing)
              .with(true, () => "Edit group" as const)
              .otherwise(() => "New group" as const)}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {match(editing)
              .with(true, () => "Rename it or change its description." as const)
              .otherwise(() => "Give it a name. Add people after." as const)}
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
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {match(pending)
                  .with(true, () => "Saving…" as const)
                  .otherwise(() => saveLabel)}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
