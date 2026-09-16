import { orgPath } from "@absqir/core/org-path";
import { toSlug, toSlugDraft } from "@absqir/core/slug";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { cn } from "@absqir/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { type ControllerRenderProps, useForm } from "react-hook-form";
import { match } from "ts-pattern";
import { type OrganizationValues, organizationSchema } from "@/lib/auth-schemas";
import { type SlugState, useSlugAvailable } from "@/queries/use-slug-available";

export interface OrganizationFormProps {
  submitLabel: string;
  pending: boolean;
  defaultValues?: OrganizationValues;
  /**
   * The slug this organization already holds. The form reads it as free, so
   * a rename that only touches the name never says the slug is taken.
   */
  ownSlug?: string;
  onSubmit: (values: OrganizationValues) => void;
}

/**
 * What the reader is told about the slug they typed, under the field. The
 * slug is the address of the organization, so the line shows the address
 * rather than the slug alone.
 */
function SlugStatus(props: { state: SlugState; slug: string }) {
  const t = useTranslate();
  const { state, slug } = props;

  const text = match(state)
    .with("empty", "invalid", () => t("common:organizationForm.slugHint"))
    .with("checking", () => t("common:organizationForm.slugChecking"))
    .with("reserved", () => t("common:organizationForm.slugReserved"))
    .with("taken", () => t("common:organizationForm.slugTaken"))
    .otherwise(() => t("common:organizationForm.slugFree", { address: orgPath(slug, "/") }));

  const tone = match(state)
    .with("reserved", "taken", () => "text-destructive")
    .with("free", () => "text-muted-foreground")
    .otherwise(() => "text-muted-foreground");

  return (
    <p aria-live="polite" className={cn("text-xs", tone)}>
      {text}
    </p>
  );
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
  const slug = form.watch("slug");
  const slugState = useSlugAvailable({ slug, own: props.ownSlug });

  // A slug the server will refuse never reaches it. Checking does not block:
  // a slow answer must not hold the reader back, and the server decides.
  const refused = slugState === "taken" || slugState === "reserved";

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

        <div className="space-y-2">
          <FormField
            control={form.control}
            name="slug"
            label={t("common:organizationForm.slug")}
            render={(field) => <SlugInput field={field} />}
          />
          <SlugStatus state={slugState} slug={slug} />
        </div>

        <Button type="submit" disabled={props.pending || refused} className="w-full">
          {match(props.pending)
            .with(true, () => t("common:actions.saving"))
            .otherwise(() => props.submitLabel)}
        </Button>
      </form>
    </Form>
  );
}
