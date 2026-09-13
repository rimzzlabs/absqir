import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { match } from "ts-pattern";
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
  const t = useTranslate();
  const form = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema(t)),
    defaultValues: props.defaultValues ?? { name: "", slug: "" },
  });

  const slugTouched = form.formState.dirtyFields.slug === true;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(props.onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="name"
          label={t("common:organizationForm.name")}
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
          label={t("common:organizationForm.slug")}
          description={t("common:organizationForm.slugHint")}
          render={(field) => <Input {...field} id="organization-slug" autoComplete="off" />}
        />

        <Button type="submit" disabled={props.pending} className="w-full">
          {match(props.pending)
            .with(true, () => t("common:actions.saving"))
            .otherwise(() => props.submitLabel)}
        </Button>
      </form>
    </Form>
  );
}
