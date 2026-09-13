import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import { Field, FieldContent, FieldLabel } from "@absqir/ui/field";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { RoleSelect } from "@/components/shared/role-select";
import { type PersonValues, personSchema } from "@/lib/directory-schemas";
import { useCreatePerson } from "@/mutations/use-create-person";
import { useUpdatePerson } from "@/mutations/use-update-person";
import type { Person } from "@/queries/use-people";

export interface PersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null creates, a person edits. */
  person: Person | null;
}

function defaults(person: Person | null): PersonValues {
  return {
    name: person?.name ?? "",
    email: person?.email ?? "",
    identifier: person?.identifier ?? "",
    invite: false,
    role: "member",
  };
}

export function PersonDialog(props: PersonDialogProps) {
  const editing = props.person !== null;
  const form = useForm<PersonValues>({
    resolver: zodResolver(personSchema),
    defaultValues: defaults(props.person),
  });

  const create = useCreatePerson();
  const update = useUpdatePerson();
  const pending = create.isPending || update.isPending;
  const invite = form.watch("invite");
  const addLabel = match(invite)
    .with(true, () => "Add and invite" as const)
    .otherwise(() => "Add" as const);
  const saveLabel = match(editing)
    .with(true, () => "Save" as const)
    .otherwise(() => addLabel);
  const email = form.watch("email");

  // Reopening for another person, or after a save, starts from that person.
  useEffect(() => {
    if (props.open) form.reset(defaults(props.person));
  }, [props.open, props.person, form]);

  const onSubmit = (values: PersonValues) => {
    const payload = {
      name: values.name,
      email: match(values.email)
        .with(P.string.minLength(1), (email) => email.toLowerCase())
        .otherwise(() => null),
      identifier: values.identifier || null,
    };

    if (props.person) {
      update.mutate(
        { id: props.person.id, ...payload },
        { onSuccess: () => props.onOpenChange(false) },
      );
      return;
    }

    create.mutate(
      { ...payload, invite: values.invite, role: values.role },
      { onSuccess: () => props.onOpenChange(false) },
    );
  };

  return (
    <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {match(editing)
              .with(true, () => "Edit person" as const)
              .otherwise(() => "Add a person" as const)}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {match(editing)
              .with(
                true,
                () =>
                  "Changes apply to the directory. The account, if any, keeps its own name." as const,
              )
              .otherwise(
                () => "A directory entry. Tick the box to email an invitation right away." as const,
              )}
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
                label="Full name"
                render={(field) => <Input {...field} id="person-name" autoFocus />}
              />
              <FormField
                control={form.control}
                name="email"
                label="Email"
                description="Needed for an invitation. Optional otherwise."
                render={(field) => <Input {...field} id="person-email" type="email" />}
              />
              <FormField
                control={form.control}
                name="identifier"
                label="Identifier"
                description="Employee or member number. Optional."
                render={(field) => <Input {...field} id="person-identifier" autoComplete="off" />}
              />

              {match(editing)
                .with(true, () => null)
                .otherwise(() => (
                  <>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="person-invite"
                        checked={invite}
                        disabled={!email}
                        onCheckedChange={(checked) => form.setValue("invite", checked === true)}
                      />
                      <Label htmlFor="person-invite">Send an invitation to sign in</Label>
                    </div>

                    {match(invite)
                      .with(true, () => (
                        <Field>
                          <FieldLabel htmlFor="person-role">Role</FieldLabel>
                          <FieldContent>
                            <RoleSelect
                              id="person-role"
                              value={form.watch("role")}
                              onChange={(value) => form.setValue("role", value)}
                            />
                          </FieldContent>
                        </Field>
                      ))
                      .otherwise(() => null)}
                  </>
                ))}

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
