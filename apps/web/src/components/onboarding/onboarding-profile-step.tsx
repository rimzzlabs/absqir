import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AuthHeading } from "@/components/auth/auth-heading";
import { FormError } from "@/components/shared/form-error";
import { MIN_PASSWORD_LENGTH, type ProfileValues, profileSchema } from "@/lib/auth-schemas";
import { useOnboardingProfile } from "@/mutations/use-onboarding-profile";
import type { OnboardingStatus } from "@/queries/use-onboarding";

export interface OnboardingProfileStepProps {
  status: OnboardingStatus;
}

export function OnboardingProfileStep(props: OnboardingProfileStepProps) {
  // A linked provider is a credential too. Asking for a password right after
  // the reader chose the provider button takes back what the button offered.
  const needsPassword = !props.status.hasPassword && props.status.linkedProviders.length === 0;

  const form = useForm<ProfileValues>({
    resolver: zodResolver(
      needsPassword ? profileSchema.required({ password: true }) : profileSchema,
    ),
    defaultValues: { name: props.status.name, password: "" },
  });

  const save = useOnboardingProfile();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          save.mutate({ name: values.name, password: needsPassword ? values.password : undefined }),
        )}
        className="space-y-5"
        noValidate
      >
        <AuthHeading
          title="Tell us your name"
          description={
            needsPassword
              ? "The name your organizers see, and a password for next time."
              : "The name your organizers see."
          }
        />

        <FormField
          control={form.control}
          name="name"
          label="Full name"
          render={(field) => <Input {...field} id="name" autoComplete="name" autoFocus />}
        />

        {needsPassword ? (
          <FormField
            control={form.control}
            name="password"
            label="Password"
            description={`At least ${MIN_PASSWORD_LENGTH} characters. You can also sign in with an emailed code later.`}
            render={(field) => (
              <Input {...field} id="password" type="password" autoComplete="new-password" />
            )}
          />
        ) : null}

        <FormError error={save.error} />

        <Button type="submit" disabled={save.isPending} className="w-full">
          {save.isPending ? "Saving…" : "Continue"}
        </Button>
      </form>
    </Form>
  );
}
