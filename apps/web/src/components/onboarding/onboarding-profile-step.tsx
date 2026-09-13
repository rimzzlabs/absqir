import type { Locale, Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@absqir/ui/collapsible";
import { Field, FieldDescription, FieldLabel } from "@absqir/ui/field";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { A, O } from "@mobily/ts-belt";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { FormError } from "@/components/shared/form-error";
import { LanguageField } from "@/components/shared/language-field";
import { isAuthProvider, providerLabel } from "@/lib/auth-providers";
import {
  MIN_PASSWORD_LENGTH,
  type ProfileValues,
  profileSchema,
  profileWithPasswordSchema,
} from "@/lib/auth-schemas";
import { useOnboardingProfile } from "@/mutations/use-onboarding-profile";
import type { OnboardingStatus } from "@/queries/use-onboarding";

export interface OnboardingProfileStepProps {
  status: OnboardingStatus;
  /**
   * What this page already reads in: the account's choice when it has one,
   * the browser's own language when it does not. The picker opens on it.
   */
  locale: Locale;
}

/** "GitHub", or a stand-in name for a provider this build does not name. */
function firstProviderLabel(t: Translate, providers: string[]): string {
  const first = A.getBy(providers, (provider) => isAuthProvider(provider));

  return match(O.toNullable(first))
    .with(P.string.and(P.when(isAuthProvider)), (provider) => providerLabel(t, provider))
    .otherwise(() => t("auth:providers.fallbackName"));
}

export function OnboardingProfileStep(props: OnboardingProfileStepProps) {
  const { status } = props;
  const t = useTranslate();

  // Everybody meets this picker once: the owner who starts an organization,
  // and the member who arrives from an invitation. Both land here first.
  const [locale, setLocale] = useState<Locale>(status.locale ?? props.locale);

  // A linked provider is a credential too. Asking for a password right after
  // the reader chose the provider button takes back what the button offered,
  // so the field is there, folded away, for whoever wants one.
  const mustSetPassword = !status.hasPassword && status.linkedProviders.length === 0;
  const canAddPassword = !status.hasPassword && !mustSetPassword;

  const [addingPassword, setAddingPassword] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(
      match(mustSetPassword)
        .with(true, () => profileWithPasswordSchema(t))
        .otherwise(() => profileSchema(t)),
    ),
    defaultValues: { name: status.name, password: "" },
  });

  const save = useOnboardingProfile();

  const passwordField = (
    <FormField
      control={form.control}
      name="password"
      label={t("onboarding:profile.password")}
      description={t("onboarding:profile.passwordHint", { count: MIN_PASSWORD_LENGTH })}
      render={(field) => (
        <Input {...field} id="password" type="password" autoComplete="new-password" />
      )}
    />
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          // An empty field means no password. The route refuses an empty one.
          save.mutate({ name: values.name, password: values.password || undefined, locale }),
        )}
        className="space-y-5"
        noValidate
      >
        <AuthHeading
          title={t("onboarding:profile.title")}
          description={match(mustSetPassword)
            .with(true, () => t("onboarding:profile.descriptionWithPassword"))
            .otherwise(() => t("onboarding:profile.description"))}
        />

        <FormField
          control={form.control}
          name="name"
          label={t("onboarding:profile.fullName")}
          render={(field) => <Input {...field} id="name" autoComplete="name" autoFocus />}
        />

        <Field>
          <FieldLabel htmlFor="onboarding-language">{t("onboarding:language.label")}</FieldLabel>
          <LanguageField id="onboarding-language" value={locale} onChange={setLocale} />
          <FieldDescription>{t("onboarding:language.hint")}</FieldDescription>
        </Field>

        {match(mustSetPassword)
          .with(true, () => passwordField)
          .otherwise(() => null)}

        {match(canAddPassword)
          .with(true, () => (
            <Collapsible
              open={addingPassword}
              onOpenChange={(open) => {
                setAddingPassword(open);
                // A folded field must not travel with the form.
                if (!open) form.setValue("password", "", { shouldValidate: false });
              }}
            >
              <CollapsibleTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                  />
                }
              >
                {t("onboarding:profile.addPassword")}
                <CaretDownIcon
                  className={match(addingPassword)
                    .with(true, () => "rotate-180")
                    .otherwise(() => undefined)}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <p className="text-muted-foreground mb-4 text-sm">
                  {t("onboarding:profile.addPasswordHint", {
                    provider: firstProviderLabel(t, status.linkedProviders),
                  })}
                </p>
                {passwordField}
              </CollapsibleContent>
            </Collapsible>
          ))
          .otherwise(() => null)}

        <FormError error={save.error} />

        <Button type="submit" disabled={save.isPending} className="w-full">
          {match(save.isPending)
            .with(true, () => t("common:actions.saving"))
            .otherwise(() => t("onboarding:profile.continue"))}
        </Button>
      </form>
    </Form>
  );
}
