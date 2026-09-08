import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { DevicesGrid, useHasOtherDevices } from "@/components/account/devices-grid";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { FormError } from "@/components/shared/form-error";
import { type ChangePasswordValues, changePasswordSchema } from "@/lib/account-schemas";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-schemas";
import { useChangePassword } from "@/mutations/use-change-password";
import { useRevokeSession } from "@/mutations/use-revoke-session";

function PasswordRow() {
  const change = useChangePassword();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", signOutOthers: false },
  });

  return (
    <SettingsRow
      label="Password"
      hint={`At least ${MIN_PASSWORD_LENGTH} characters. Forgot it? Sign out, then choose the emailed code on the sign-in page.`}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            change.mutate(values, { onSuccess: () => form.reset() }),
          )}
          className="space-y-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="signOutOthers"
              checked={form.watch("signOutOthers")}
              onCheckedChange={(checked) => form.setValue("signOutOthers", checked === true)}
            />
            <Label htmlFor="signOutOthers">Sign out my other devices</Label>
          </div>

          <FormError error={change.error} />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? "Changing…" : "Change password"}
            </Button>
            {change.isSuccess ? (
              <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircleIcon weight="fill" className="size-4" />
                Password changed.
              </p>
            ) : null}
          </div>
        </form>
      </Form>
    </SettingsRow>
  );
}

function SignOutOthers() {
  const hasOthers = useHasOtherDevices();
  const revoke = useRevokeSession();

  if (!hasOthers) return null;

  return (
    <Button variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate(null)}>
      Sign out everywhere else
    </Button>
  );
}

/** The password, and every browser that holds a session. */
export function SecurityPanel() {
  return (
    <div className="space-y-12">
      <SettingsSection title="Sign-in" description="What proves it is you.">
        <PasswordRow />
      </SettingsSection>

      <SettingsSection
        title="Devices"
        description="Every browser signed in as you. Sign out the ones you do not know."
        actions={<SignOutOthers />}
      >
        <div className="pt-6">
          <DevicesGrid />
        </div>
      </SettingsSection>
    </div>
  );
}
