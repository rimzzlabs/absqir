import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AuthHeading } from "@/components/auth/auth-heading";
import { CodeInput } from "@/components/auth/code-input";
import { FormError } from "@/components/shared/form-error";
import { type CodeValues, codeSchema } from "@/lib/auth-schemas";
import { useCooldown } from "@/lib/use-cooldown";
import { useSendCode } from "@/mutations/use-send-code";
import { useVerifyCode } from "@/mutations/use-verify-code";

/** How long a reader waits before a new code can be asked for. */
export const RESEND_COOLDOWN_SECONDS = 30;

export interface AuthCodeStepProps {
  email: string;
  /** The email had no account; a correct code creates one. */
  isNew: boolean;
  next: string;
  onBack: () => void;
}

export function AuthCodeStep(props: AuthCodeStepProps) {
  const form = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const verify = useVerifyCode({ redirectTo: props.next });
  const resend = useSendCode();
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);
  const submitLabel = props.isNew ? "Create my account" : "Sign in";
  const resendLabel = cooldown.ready ? "Send a new code" : `New code in ${cooldown.remaining}s`;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          verify.mutate({ email: props.email, code: values.code }),
        )}
        className="space-y-5"
        noValidate
      >
        <AuthHeading
          title={props.isNew ? "Check your inbox" : "Enter your code"}
          description={`We sent a 6 digit code to ${props.email}. It works for 10 minutes.`}
        />

        <FormField
          control={form.control}
          name="code"
          label="Code"
          render={(field) => (
            <CodeInput
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                if (value.length === 6)
                  void form.handleSubmit((values) =>
                    verify.mutate({ email: props.email, code: values.code }),
                  )();
              }}
              disabled={verify.isPending}
            />
          )}
        />

        <FormError error={verify.error ?? resend.error} />

        <Button type="submit" disabled={verify.isPending} className="w-full">
          {verify.isPending ? "Checking…" : submitLabel}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Button type="button" variant="link" size="sm" className="px-0" onClick={props.onBack}>
            Use another email
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            disabled={resend.isPending || !cooldown.ready}
            onClick={() =>
              resend.mutate(
                { email: props.email, purpose: "sign-in" },
                { onSuccess: cooldown.restart },
              )
            }
          >
            {resend.isPending ? "Sending…" : resendLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
