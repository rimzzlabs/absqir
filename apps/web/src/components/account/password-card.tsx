import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Checkbox } from "@absqir/ui/checkbox";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/shared/form-error";
import { type ChangePasswordValues, changePasswordSchema } from "@/lib/account-schemas";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-schemas";
import { useChangePassword } from "@/mutations/use-change-password";

export function PasswordCard() {
  const change = useChangePassword();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", signOutOthers: false },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          At least {MIN_PASSWORD_LENGTH} characters. Forgot it? Sign out, then choose the emailed
          code on the sign-in page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              change.mutate(values, { onSuccess: () => form.reset() }),
            )}
            className="space-y-5"
            noValidate
          >
            <FormField
              control={form.control}
              name="currentPassword"
              label="Current password"
              render={(field) => (
                <Input
                  {...field}
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                />
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              label="New password"
              render={(field) => (
                <Input {...field} id="newPassword" type="password" autoComplete="new-password" />
              )}
            />

            <div className="flex items-center gap-2">
              <Checkbox
                id="signOutOthers"
                checked={form.watch("signOutOthers")}
                onCheckedChange={(checked) => form.setValue("signOutOthers", checked === true)}
              />
              <Label htmlFor="signOutOthers">Sign out my other devices</Label>
            </div>

            <FormError error={change.error} />

            {change.isSuccess ? (
              <p role="status" className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircleIcon weight="fill" className="size-4" />
                Password changed.
              </p>
            ) : null}

            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? "Changing…" : "Change password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
