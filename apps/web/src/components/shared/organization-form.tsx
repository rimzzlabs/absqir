import { toSlugDraft } from "@absqir/core/slug";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { type ControllerRenderProps, useForm } from "react-hook-form";
import { match } from "ts-pattern";
import { type OrganizationValues, organizationSchema } from "@/lib/auth-schemas";
import { toSlug } from "@/lib/slug";

export interface OrganizationFormProps {
  submitLabel: string;
  pending: boolean;
  defaultValues?: OrganizationValues;
  onSubmit: (values: OrganizationValues) => void;
}

/**
 * The slug field. It keeps letters, digits and hyphens, and drops the rest
 * as the reader types. A space becomes a hyphen. See toSlugDraft in core.
 *
 * A controlled input that rewrites what was typed leaves the caret at the
 * end. This puts the caret back where the reader left it, so a space added
 * in the middle of a slug does not throw them to the far end of the field.
 */
function SlugInput(props: { field: ControllerRenderProps<OrganizationValues, "slug"> }) {
  const input = useRef<HTMLInputElement | null>(null);
  const caret = useRef<number | null>(null);

  useEffect(() => {
    const at = caret.current;
    caret.current = null;
    if (!input.current || at === null) return;

    input.current.setSelectionRange(at, at);
  });

  return (
    <Input
      {...props.field}
      ref={(node) => {
        input.current = node;
        props.field.ref(node);
      }}
      id="organization-slug"
      autoComplete="off"
      onChange={(event) => {
        const typed = event.target.value;
        const slug = toSlugDraft(typed);
        // Whatever the rule dropped sat before the caret, so the caret comes
        // back by that much.
        const at = event.target.selectionStart ?? typed.length;
        caret.current = at - (typed.length - slug.length);
        props.field.onChange(slug);
      }}
    />
  );
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
          render={(field) => <SlugInput field={field} />}
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
