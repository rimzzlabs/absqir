import { formatDate } from "@absqir/core/date";
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { type DataColumn, DataTable } from "@absqir/ui/data-table";
import { Field, FieldContent, FieldLabel } from "@absqir/ui/field";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { Skeleton } from "@absqir/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaperPlaneTiltIcon, XIcon } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { RoleBadge } from "@/components/shared/role-badge";
import { RoleSelect } from "@/components/shared/role-select";
import { type InviteValues, inviteSchema } from "@/lib/directory-schemas";
import { useCancelInvitation } from "@/mutations/use-cancel-invitation";
import { useInviteMember } from "@/mutations/use-invite-member";
import { type Invitation, useInvitations } from "@/queries/use-members";

function asRole(role: string) {
  return match(role)
    .with("owner", "admin", "organizer", (name) => name)
    .otherwise(() => "member" as const);
}

function InviteForm() {
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });
  const invite = useInviteMember();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite someone</CardTitle>
        <CardDescription>
          They get an email with a link. On the other side they create an account, or sign in, and
          land here. The invitation lasts 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              invite.mutate(
                { email: values.email.toLowerCase(), role: values.role },
                { onSuccess: () => form.reset() },
              ),
            )}
            className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              label="Email"
              render={(field) => <Input {...field} id="invite-email" type="email" />}
            />
            <Field>
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <FieldContent>
                <RoleSelect
                  id="invite-role"
                  value={form.watch("role")}
                  onChange={(value) => form.setValue("role", value)}
                />
              </FieldContent>
            </Field>
            <Button type="submit" disabled={invite.isPending}>
              <PaperPlaneTiltIcon />
              {match(invite.isPending)
                .with(true, () => "Sending…" as const)
                .otherwise(() => "Send" as const)}
            </Button>
          </form>
        </Form>
        <FormError error={invite.error} />
      </CardContent>
    </Card>
  );
}

function PendingList() {
  const invitations = useInvitations();
  const cancel = useCancelInvitation();

  const columns: DataColumn<Invitation>[] = [
    {
      key: "email",
      header: "Email",
      place: "primary",
      cell: (row) => row.email,
      cellClassName: "font-medium",
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => <RoleBadge role={asRole(row.role)} />,
    },
    {
      key: "expires",
      header: "Expires",
      cell: (row) => formatDate(new Date(row.expiresAt), "date"),
      cellClassName: "text-muted-foreground",
    },
    {
      key: "cancel",
      place: "action",
      headClassName: "w-16",
      cellClassName: "text-right",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Cancel the invitation for ${row.email}`}
          disabled={cancel.isPending}
          onClick={() => cancel.mutate(row.id)}
        >
          <XIcon />
        </Button>
      ),
    },
  ];

  return match(invitations)
    .with({ isPending: true }, () => <Skeleton className="h-32 rounded-xl" />)
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (rows) =>
      match(rows.length)
        .with(0, () => <p className="text-muted-foreground text-sm">No invitation is waiting.</p>)
        .otherwise(() => (
          <div className="space-y-2">
            <DataTable
              label="Invitations waiting"
              columns={columns}
              rows={rows}
              getKey={(row) => row.id}
            />
            <FormError error={cancel.error} />
          </div>
        )),
    )
    .otherwise(() => null);
}

export function InvitationsPanel() {
  return (
    <div className="space-y-6">
      <InviteForm />
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Pending</h2>
        <PendingList />
      </section>
    </div>
  );
}
