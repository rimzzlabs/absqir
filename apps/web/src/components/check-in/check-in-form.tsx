import { formatDate } from "@absqir/core/date";
import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { Reveal } from "@absqir/ui/reveal";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { Providers } from "@/components/providers";
import { type CheckInValues, checkInSchema } from "@/lib/attendance-schemas";
import { useCheckIn } from "@/mutations/use-check-in";

export interface CheckInFormProps {
  sessionId: string;
  /** Read from the scanned URL. Absent when the page is opened by hand. */
  token: string | null;
}

function CheckInFields(props: CheckInFormProps) {
  const form = useForm<CheckInValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { name: "", identifier: "" },
  });

  const checkIn = useCheckIn();

  if (!props.token) {
    return (
      <p className="text-muted-foreground text-sm">
        This page opens from a scanned QR code. Point your camera at the code on the screen.
      </p>
    );
  }

  if (checkIn.data) {
    return (
      <Reveal className="border-border rounded-lg border p-6 text-center">
        <CheckCircleIcon aria-hidden size={40} className="mx-auto text-emerald-500" />
        <p className="mt-3 text-lg font-medium">You are in, {checkIn.data.name}.</p>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          {checkIn.data.identifier} · {formatDate(new Date(checkIn.data.checkedInAt), "time")}
        </p>
      </Reveal>
    );
  }

  const token = props.token;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          checkIn.mutate({ ...values, sessionId: props.sessionId, token }),
        )}
        className="space-y-5"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          label="Name"
          render={(field) => <Input {...field} id="name" autoComplete="name" />}
        />

        <FormField
          control={form.control}
          name="identifier"
          label="Student or employee ID"
          render={(field) => <Input {...field} id="identifier" autoComplete="off" />}
        />

        {checkIn.error ? (
          <p role="alert" className="text-destructive text-sm">
            {checkIn.error.message}
          </p>
        ) : null}

        <Button type="submit" disabled={checkIn.isPending} className="w-full">
          {checkIn.isPending ? "Checking in…" : "Check in"}
        </Button>
      </form>
    </Form>
  );
}

export function CheckInForm(props: CheckInFormProps) {
  return (
    <Providers>
      <CheckInFields {...props} />
    </Providers>
  );
}
