import { Button } from "@absqir/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@absqir/ui/collapsible";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { A, O } from "@mobily/ts-belt";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { FormError } from "@/components/shared/form-error";
import { isAuthProvider, providerLabel } from "@/lib/auth-providers";
import {
  MIN_PASSWORD_LENGTH,
  type ProfileValues,
  profileSchema,
  profileWithPasswordSchema,
} from "@/lib/auth-schemas";
import { useOnboardingProfile } from "@/mutations/use-onboarding-profile";
import type { OnboardingStatus } from "@/queries/use-onboarding";

export interface OnboardingProfileStepProps {
  status: OnboardingStatus;
}

/** "GitHub", or "Your provider" for one this build does not name. */
function firstProviderLabel(providers: string[]): string {
  const first = A.getBy(providers, (provider) => isAuthProvider(provider));

  return match(O.toNullable(first))
    .with(P.string.and(P.when(isAuthProvider)), (provider) => providerLabel(provider))
    .otherwise(() => "Your provider");
}

export function OnboardingProfileStep(props: OnboardingProfileStepProps) {
  const { status } = props;

  // A linked provider is a credential too. Asking for a password right after
  // the reader chose the provider button takes back what the button offered,
  // so the field is there, folded away, for whoever wants one.
  const mustSetPassword = !status.hasPassword && status.linkedProviders.length === 0;
  const canAddPassword = !status.hasPassword && !mustSetPassword;

  const [addingPassword, setAddingPassword] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(
      match(mustSetPassword)
        .with(true, () => profileWithPasswordSchema)
        .otherwise(() => profileSchema),
    ),
    defaultValues: { name: status.name, password: "" },
  });

  const save = useOnboardingProfile();

  const passwordField = (
    <FormField
      control={form.control}
      name="password"
      label="Password"
      description={`At least ${MIN_PASSWORD_LENGTH} characters. You can also sign in with an emailed code later.`}
      render={(field) => (
        <Input {...field} id="password" type="password" autoComplete="new-password" />
      )}
    />
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          // An empty field means no password. The route refuses an empty one.
          save.mutate({ name: values.name, password: values.password || undefined }),
        )}
        className="space-y-5"
        noValidate
      >
        <AuthHeading
          title="Tell us your name"
          description={match(mustSetPassword)
            .with(true, () => "The name your organizers see, and a password for next time.")
            .otherwise(() => "The name your organizers see.")}
        />

        <FormField
          control={form.control}
          name="name"
          label="Full name"
          render={(field) => <Input {...field} id="name" autoComplete="name" autoFocus />}
        />

        {match(mustSetPassword)
          .with(true, () => passwordField)
          .otherwise(() => null)}

        {match(canAddPassword)
          .with(true, () => (
            <Collapsible
              open={addingPassword}
              onOpenChange={(open) => {
                setAddingPassword(open);
                // A folded field must not travel with the form.
                if (!open) form.setValue("password", "", { shouldValidate: false });
              }}
            >
              <CollapsibleTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                  />
                }
              >
                Add a password
                <CaretDownIcon
                  className={match(addingPassword)
                    .with(true, () => "rotate-180")
                    .otherwise(() => undefined)}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <p className="text-muted-foreground mb-4 text-sm">
                  {firstProviderLabel(status.linkedProviders)} already signs you in. A password is
                  one more way back, for a device where that account is not set up.
                </p>
                {passwordField}
              </CollapsibleContent>
            </Collapsible>
          ))
          .otherwise(() => null)}

        <FormError error={save.error} />

        <Button type="submit" disabled={save.isPending} className="w-full">
          {match(save.isPending)
            .with(true, () => "Saving…" as const)
            .otherwise(() => "Continue" as const)}
        </Button>
      </form>
    </Form>
  );
}
