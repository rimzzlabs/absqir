import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type OrganizationValues, organizationSchema } from "@/lib/auth-schemas";
import { toSlug } from "@/lib/slug";

export interface OrganizationFormProps {
  submitLabel: string;
  pending: boolean;
  defaultValues?: OrganizationValues;
  onSubmit: (values: OrganizationValues) => void;
}

/** Name and slug. The slug follows the name until the reader edits it. */
export function OrganizationForm(props: OrganizationFormProps) {
  const form = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: props.defaultValues ?? { name: "", slug: "" },
  });

  const slugTouched = form.formState.dirtyFields.slug === true;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(props.onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="name"
          label="Organization name"
          render={(field) => (
            <Input
              {...field}
              id="organization-name"
              autoComplete="organization"
              onChange={(event) => {
                field.onChange(event);
                if (!slugTouched) {
                  form.setValue("slug", toSlug(event.target.value), { shouldValidate: false });
                }
              }}
            />
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          label="Slug"
          description="Lowercase letters, digits, and hyphens. It shows up in links."
          render={(field) => <Input {...field} id="organization-slug" autoComplete="off" />}
        />

        <Button type="submit" disabled={props.pending} className="w-full">
          {props.pending ? "Saving…" : props.submitLabel}
        </Button>
      </form>
    </Form>
  );
}
