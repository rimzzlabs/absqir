import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { type CreateSessionValues, createSessionSchema } from "@/lib/attendance-schemas";
import { useCreateSession } from "@/mutations/use-create-session";

export function SessionTableCreate() {
  const form = useForm<CreateSessionValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: { title: "" },
  });

  const create = useCreateSession();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          create.mutate(values, { onSuccess: () => form.reset() }),
        )}
        className="flex items-end gap-3"
        noValidate
      >
        <div className="flex-1">
          <FormField
            control={form.control}
            name="title"
            label="New session"
            render={(field) => (
              <Input {...field} id="title" placeholder="Algorithms — week 3" autoComplete="off" />
            )}
          />
        </div>

        <Button type="submit" disabled={create.isPending}>
          <PlusIcon />
          {create.isPending ? "Creating…" : "Create"}
        </Button>

        {create.error ? (
          <p role="alert" className="text-destructive text-sm">
            {create.error.message}
          </p>
        ) : null}
      </form>
    </Form>
  );
}
