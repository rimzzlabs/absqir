import { LOCALE_NAMES, type Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { TranslateIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { LanguageField } from "@/components/shared/language-field";
import { SettingsRow } from "@/components/shared/settings-section";
import { useDeviceLocale } from "@/lib/use-device-locale";
import { useUpdateLocale } from "@/mutations/use-update-locale";

export interface LanguageRowProps {
  /** What the account reads in now. */
  locale: Locale;
}

/** The language of every screen, every notification, and every email. */
export function LanguageRow(props: LanguageRowProps) {
  const t = useTranslate();
  const [chosen, setChosen] = useState<Locale>(props.locale);
  const save = useUpdateLocale();
  const device = useDeviceLocale();
  const dirty = chosen !== props.locale;

  return (
    <SettingsRow label={t("settings:language.label")} hint={t("settings:language.hint")}>
      <div className="flex flex-col gap-3">
        <LanguageField
          id="language"
          value={chosen}
          onChange={setChosen}
          className="w-full sm:max-w-md"
        />

        {match(device)
          .with(null, () => null)
          .otherwise((device) => (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <TranslateIcon aria-hidden className="size-3.5" />
              {t("settings:language.followingDevice", { language: LOCALE_NAMES[device] })}
            </p>
          ))}

        <div>
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending || !dirty}
            onClick={() => save.mutate(chosen)}
          >
            {match(save.isPending)
              .with(true, () => t("common:actions.saving"))
              .otherwise(() => t("common:actions.save"))}
          </Button>
        </div>
        <FormError error={save.error} />
      </div>
    </SettingsRow>
  );
}
