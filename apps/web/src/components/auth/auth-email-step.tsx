import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthProviderButtons } from "@/components/auth/auth-provider-buttons";
import { FormError } from "@/components/shared/form-error";
import type { AuthProviderId } from "@/lib/auth-providers";
import { type EmailValues, emailSchema } from "@/lib/auth-schemas";
import { useLookupEmail } from "@/mutations/use-lookup-email";
import { useSendCode } from "@/mutations/use-send-code";

export interface AuthEmailStepProps {
  initialEmail: string;
  eventId: string | null;
  /** The providers the operator turned on. Empty hides the whole row. */
  providers: readonly AuthProviderId[];
  /** Where a provider sends the reader back to. */
  next: string;
  /** What went wrong on the way back from a provider, if anything. */
  notice: string | null;
  /** The password is whatever a password manager put in the hidden field. */
  onKnownWithPassword: (email: string, password: string) => void;
  onCodeSent: (email: string, isNew: boolean) => void;
  onClosed: (email: string) => void;
}

export function AuthEmailStep(props: AuthEmailStepProps) {
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: props.initialEmail },
  });

  const lookup = useLookupEmail();
  const sendCode = useSendCode();
  const pending = lookup.isPending || sendCode.isPending;
  const hiddenPassword = useRef<HTMLInputElement>(null);

  const onSubmit = async ({ email }: EmailValues) => {
    const normalized = email.trim().toLowerCase();
    const result = await lookup.mutateAsync({ email: normalized, eventId: props.eventId });

    if (result.exists && result.hasPassword) {
      props.onKnownWithPassword(normalized, hiddenPassword.current?.value ?? "");
      return;
    }

    if (!result.exists && !result.canRegister) {
      props.onClosed(normalized);
      return;
    }

    // Either a brand new email, or an account that never set a password.
    await sendCode.mutateAsync({ email: normalized, purpose: "sign-in" });
    props.onCodeSent(normalized, !result.exists);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values).catch(() => {}))}
        className="space-y-5"
        noValidate
      >
        <AuthHeading
          title="Sign in or create an account"
          description="Enter your email. We will tell you what comes next."
        />

        {props.notice ? (
          <p role="alert" className="text-destructive text-sm">
            {props.notice}
          </p>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          label="Email"
          render={(field) => (
            <Input {...field} id="email" type="email" autoComplete="email" autoFocus />
          )}
        />

        {/*
          A password manager only offers a saved login to a form that has a
          password field. This one is out of sight and out of the tab order;
          what lands in it travels to the next step.
        */}
        <input
          ref={hiddenPassword}
          type="password"
          name="password"
          autoComplete="current-password"
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />

        <FormError error={lookup.error ?? sendCode.error} />

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking…" : "Continue"}
        </Button>

        <AuthProviderButtons providers={props.providers} next={props.next} />
      </form>
    </Form>
  );
}
