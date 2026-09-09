import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { RESEND_COOLDOWN_SECONDS } from "@/components/auth/auth-code-step";
import { AuthHeading } from "@/components/auth/auth-heading";
import { CodeInput } from "@/components/auth/code-input";
import { FormError } from "@/components/shared/form-error";
import { MIN_PASSWORD_LENGTH, type ResetValues, resetSchema } from "@/lib/auth-schemas";
import { useCooldown } from "@/lib/use-cooldown";
import { useResetPassword } from "@/mutations/use-reset-password";
import { useSendCode } from "@/mutations/use-send-code";

export interface AuthResetStepProps {
  email: string;
  next: string;
  onBack: () => void;
}

/** The code path for a known account: the code and a new password, then in. */
export function AuthResetStep(props: AuthResetStepProps) {
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: "", password: "" },
  });

  const reset = useResetPassword({ redirectTo: props.next });
  const resend = useSendCode();
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => reset.mutate({ email: props.email, ...values }))}
        className="space-y-5"
        noValidate
      >
        <AuthHeading
          title="Enter your code"
          description={`We sent a 6 digit code to ${props.email}. Choose a new password with it.`}
        />

        <FormField
          control={form.control}
          name="code"
          label="Code"
          render={(field) => (
            <CodeInput value={field.value} onChange={field.onChange} disabled={reset.isPending} />
          )}
        />

        <FormField
          control={form.control}
          name="password"
          label="New password"
          description={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          render={(field) => (
            <Input {...field} id="password" type="password" autoComplete="new-password" />
          )}
        />

        <FormError error={reset.error ?? resend.error} />

        <Button type="submit" disabled={reset.isPending} className="w-full">
          {reset.isPending ? "Saving…" : "Set password and sign in"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Button type="button" variant="link" size="sm" className="px-0" onClick={props.onBack}>
            Back to password
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            disabled={resend.isPending || !cooldown.ready}
            onClick={() =>
              resend.mutate(
                { email: props.email, purpose: "forget-password" },
                { onSuccess: cooldown.restart },
              )
            }
          >
            {resend.isPending
              ? "Sending…"
              : cooldown.ready
                ? "Send a new code"
                : `New code in ${cooldown.remaining}s`}
          </Button>
        </div>
      </form>
    </Form>
  );
}
