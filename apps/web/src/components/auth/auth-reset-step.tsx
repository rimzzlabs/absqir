import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { match } from "ts-pattern";
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
  const t = useTranslate();
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema(t)),
    defaultValues: { code: "", password: "" },
  });

  const reset = useResetPassword({ redirectTo: props.next });
  const resend = useSendCode();
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);
  const resendLabel = match(cooldown.ready)
    .with(true, () => t("auth:code.sendNewCode"))
    .otherwise(() => t("auth:code.newCodeIn", { seconds: cooldown.remaining }));

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => reset.mutate({ email: props.email, ...values }))}
        className="space-y-5"
        noValidate
      >
        <AuthHeading
          title={t("auth:reset.title")}
          description={t("auth:reset.description", { email: props.email })}
        />

        <FormField
          control={form.control}
          name="code"
          label={t("auth:code.label")}
          render={(field) => (
            <CodeInput value={field.value} onChange={field.onChange} disabled={reset.isPending} />
          )}
        />

        <FormField
          control={form.control}
          name="password"
          label={t("auth:reset.newPassword")}
          description={t("auth:reset.minLength", { count: MIN_PASSWORD_LENGTH })}
          render={(field) => (
            <Input {...field} id="password" type="password" autoComplete="new-password" />
          )}
        />

        <FormError error={reset.error ?? resend.error} />

        <Button type="submit" disabled={reset.isPending} className="w-full">
          {match(reset.isPending)
            .with(true, () => t("common:actions.saving"))
            .otherwise(() => t("auth:reset.submit"))}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Button type="button" variant="link" size="sm" className="px-0" onClick={props.onBack}>
            {t("auth:reset.backToPassword")}
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
            {match(resend.isPending)
              .with(true, () => t("auth:code.sending"))
              .otherwise(() => resendLabel)}
          </Button>
        </div>
      </form>
    </Form>
  );
}
