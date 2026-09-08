import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AuthHeading } from "@/components/auth/auth-heading";
import { FormError } from "@/components/shared/form-error";
import { type EmailValues, emailSchema } from "@/lib/auth-schemas";
import { useLookupEmail } from "@/mutations/use-lookup-email";
import { useSendCode } from "@/mutations/use-send-code";

export interface AuthEmailStepProps {
  initialEmail: string;
  eventId: string | null;
  onKnownWithPassword: (email: string) => void;
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

  const onSubmit = async ({ email }: EmailValues) => {
    const normalized = email.trim().toLowerCase();
    const result = await lookup.mutateAsync({ email: normalized, eventId: props.eventId });

    if (result.exists && result.hasPassword) {
      props.onKnownWithPassword(normalized);
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

        <FormField
          control={form.control}
          name="email"
          label="Email"
          render={(field) => (
            <Input {...field} id="email" type="email" autoComplete="email" autoFocus />
          )}
        />

        <FormError error={lookup.error ?? sendCode.error} />

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking…" : "Continue"}
        </Button>
      </form>
    </Form>
  );
}
