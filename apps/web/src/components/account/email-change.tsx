import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CodeInput } from "@/components/auth/code-input";
import { FormError } from "@/components/shared/form-error";
import { type NewEmailValues, newEmailSchema } from "@/lib/account-schemas";
import { type CodeValues, codeSchema } from "@/lib/auth-schemas";
import { useConfirmEmailChange } from "@/mutations/use-confirm-email-change";
import { useRequestEmailChange } from "@/mutations/use-request-email-change";

function AddressStep(props: { onSent: (email: string) => void; onCancel: () => void }) {
  const request = useRequestEmailChange();
  const form = useForm<NewEmailValues>({
    resolver: zodResolver(newEmailSchema),
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
          label="New email"
          description="A code goes to the new address. Nothing changes until you enter it."
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
            {request.isPending ? "Sending…" : "Send the code"}
          </Button>
          <Button type="button" variant="ghost" onClick={props.onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

function CodeStep(props: { newEmail: string; onBack: () => void }) {
  const confirm = useConfirmEmailChange();
  const resend = useRequestEmailChange();
  const form = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const submit = form.handleSubmit((values) =>
    confirm.mutate({ newEmail: props.newEmail, code: values.code }),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="code"
          label="Code"
          description={`We sent a 6 digit code to ${props.newEmail}. It works for 10 minutes.`}
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
            {confirm.isPending ? "Checking…" : "Change email"}
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            disabled={resend.isPending}
            onClick={() => resend.mutate(props.newEmail)}
          >
            {resend.isPending ? "Sending…" : resend.isSuccess ? "Sent again" : "Send a new code"}
          </Button>
          <Button type="button" variant="link" size="sm" className="px-0" onClick={props.onBack}>
            Use another address
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

  return pending ? (
    <CodeStep newEmail={pending} onBack={() => setPending(null)} />
  ) : (
    <AddressStep onSent={setPending} onCancel={props.onCancel} />
  );
}
