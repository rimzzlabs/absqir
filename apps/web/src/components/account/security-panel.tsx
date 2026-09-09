import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { ConnectedAccounts } from "@/components/account/connected-accounts";
import { DevicesGrid, useHasOtherDevices } from "@/components/account/devices-grid";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { FormError } from "@/components/shared/form-error";
import {
  type ChangePasswordValues,
  changePasswordSchema,
  type SetPasswordValues,
  setPasswordSchema,
} from "@/lib/account-schemas";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-schemas";
import { useChangePassword } from "@/mutations/use-change-password";
import { useRevokeSession } from "@/mutations/use-revoke-session";
import { useSetPassword } from "@/mutations/use-set-password";
import { useCredentials } from "@/queries/use-credentials";

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

/** An account that arrived through a provider, or only ever used a code. */
function SetPasswordRow() {
  const set = useSetPassword();
  const form = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "" },
  });

  return (
    <SettingsRow
      label="Password"
      hint="This account has none. An emailed code signs you in either way, so a password is optional."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            set.mutate(values.password, { onSuccess: () => form.reset() }),
          )}
          className="space-y-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="password"
            label="New password"
            description={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            render={(field) => (
              <Input {...field} id="password" type="password" autoComplete="new-password" />
            )}
          />

          <FormError error={set.error} />

          <Button type="submit" disabled={set.isPending}>
            {set.isPending ? "Saving…" : "Set a password"}
          </Button>
        </form>
      </Form>
    </SettingsRow>
  );
}

/** Which of the two password rows this account needs. */
function PasswordSection() {
  const credentials = useCredentials();

  if (!credentials.data) return null;

  return credentials.data.hasPassword ? <PasswordRow /> : <SetPasswordRow />;
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
        <PasswordSection />
        <ConnectedAccounts />
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
