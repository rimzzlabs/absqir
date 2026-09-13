import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { CodeInput } from "@/components/auth/code-input";
import { FormError } from "@/components/shared/form-error";
import { type NewEmailValues, newEmailSchema } from "@/lib/account-schemas";
import { type CodeValues, codeSchema } from "@/lib/auth-schemas";
import { useConfirmEmailChange } from "@/mutations/use-confirm-email-change";
import { useRequestEmailChange } from "@/mutations/use-request-email-change";

function AddressStep(props: { onSent: (email: string) => void; onCancel: () => void }) {
  const t = useTranslate();
  const request = useRequestEmailChange();
  const form = useForm<NewEmailValues>({
    resolver: zodResolver(newEmailSchema(t)),
    defaultValues: { email: "" },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          request.mutate(values.email, { onSuccess: () => props.onSent(values.email) }),
        )}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="email"
          label={t("account:emailChange.newEmail")}
          description={t("account:emailChange.newEmailHint")}
          render={(field) => (
            <Input
              {...field}
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              className="max-w-sm"
            />
          )}
        />

        <FormError error={request.error} />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={request.isPending}>
            {match(request.isPending)
              .with(true, () => t("account:emailChange.sending"))
              .otherwise(() => t("account:emailChange.send"))}
          </Button>
          <Button type="button" variant="ghost" onClick={props.onCancel}>
            {t("common:actions.cancel")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function CodeStep(props: { newEmail: string; onBack: () => void }) {
  const t = useTranslate();
  const confirm = useConfirmEmailChange();
  const resend = useRequestEmailChange();
  const form = useForm<CodeValues>({
    resolver: zodResolver(codeSchema(t)),
    defaultValues: { code: "" },
  });

  const resendLabel = match(resend.isSuccess)
    .with(true, () => t("account:emailChange.sentAgain"))
    .otherwise(() => t("account:emailChange.sendNew"));
  const submit = form.handleSubmit((values) =>
    confirm.mutate({ newEmail: props.newEmail, code: values.code }),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="code"
          label={t("account:emailChange.code")}
          description={t("account:emailChange.codeHint", { email: props.newEmail })}
          render={(field) => (
            <CodeInput
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                if (value.length === 6) void submit();
              }}
              disabled={confirm.isPending}
            />
          )}
        />

        <FormError error={confirm.error ?? resend.error} />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={confirm.isPending}>
            {match(confirm.isPending)
              .with(true, () => t("account:emailChange.checking"))
              .otherwise(() => t("account:emailChange.submit"))}
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            disabled={resend.isPending}
            onClick={() => resend.mutate(props.newEmail)}
          >
            {match(resend.isPending)
              .with(true, () => t("account:emailChange.sending"))
              .otherwise(() => resendLabel)}
          </Button>
          <Button type="button" variant="link" size="sm" className="px-0" onClick={props.onBack}>
            {t("account:emailChange.useAnother")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export interface EmailChangeProps {
  onCancel: () => void;
}

/** The two steps of a new address: where to send the code, then the code. */
export function EmailChange(props: EmailChangeProps) {
  const [pending, setPending] = useState<string | null>(null);

  return match(pending)
    .with(P.string.minLength(1), (pending) => (
      <CodeStep newEmail={pending} onBack={() => setPending(null)} />
    ))
    .otherwise(() => <AddressStep onSent={setPending} onCancel={props.onCancel} />);
}
