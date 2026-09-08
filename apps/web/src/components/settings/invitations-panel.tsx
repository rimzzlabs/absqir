import { formatDate } from "@absqir/core/date";
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Field, FieldContent, FieldLabel } from "@absqir/ui/field";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { Skeleton } from "@absqir/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@absqir/ui/table";
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
import { useInvitations } from "@/queries/use-members";

function asRole(role: string) {
  return role === "owner" || role === "admin" || role === "organizer" ? role : "member";
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
              {invite.isPending ? "Sending…" : "Send"}
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

  return match(invitations)
    .with({ isPending: true }, () => <Skeleton className="h-32 rounded-xl" />)
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (rows) =>
      rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No invitation is waiting.</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={asRole(row.role)} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(new Date(row.expiresAt), "date")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Cancel the invitation for ${row.email}`}
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(row.id)}
                    >
                      <XIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <FormError error={cancel.error} />
        </div>
      ),
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
