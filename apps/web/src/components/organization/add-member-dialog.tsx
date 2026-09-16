import { useTranslate } from "@absqir/i18n/react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { match } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { RoleSelect } from "@/components/shared/role-select";
import { type InviteValues, inviteSchema } from "@/lib/directory-schemas";
import { useInviteMember } from "@/mutations/use-invite-member";

export interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * One email address and one role. The invitation lands in the same list the
 * dialog was opened from, with the status Invited.
 */
export function AddMemberDialog(props: AddMemberDialogProps) {
  const t = useTranslate();
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema(t)),
    defaultValues: { email: "", role: "member" },
  });
  const invite = useInviteMember();

  // A second opening starts empty, and never shows the error of the first.
  useEffect(() => {
    if (props.open) {
      form.reset({ email: "", role: "member" });
      invite.reset();
    }
  }, [props.open, form.reset, invite.reset]);

  const submit = (values: InviteValues) => {
    invite.mutate(
      { email: values.email.trim().toLowerCase(), role: values.role },
      { onSuccess: () => props.onOpenChange(false) },
    );
  };

  return (
    <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("organization:invitations.dialogTitle")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("organization:invitations.dialogDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Form {...form}>
          {/* The body scrolls and the footer stays put only while the form is
              the flex column. See the note on DialogBody. */}
          <form
            onSubmit={form.handleSubmit(submit)}
            className="flex min-h-0 flex-1 flex-col gap-4"
            noValidate
          >
            <ResponsiveDialogBody>
              <FormField
                control={form.control}
                name="email"
                label={t("organization:invitations.email")}
                render={(field) => (
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    autoComplete="off"
                    placeholder={t("organization:invitations.emailPlaceholder")}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="role"
                label={t("organization:invitations.role")}
                render={(field) => (
                  // The owner seat is never handed out by invitation:
                  // an owner grants it on the row, after the person joins.
                  <RoleSelect
                    id={field.name}
                    value={field.value}
                    disabled={field.disabled}
                    onChange={field.onChange}
                  />
                )}
              />

              <FormError error={invite.error} />
            </ResponsiveDialogBody>

            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                {t("common:actions.cancel")}
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {match(invite.isPending)
                  .with(true, () => t("organization:invitations.sending"))
                  .otherwise(() => t("organization:invitations.send"))}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
