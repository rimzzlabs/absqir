import { isLocale, LOCALE_NAMES, LOCALE_TAGLINES, LOCALES, type Locale } from "@absqir/i18n";
import { useTranslation } from "@absqir/i18n/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemDescription,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@absqir/ui/select";
import { A } from "@mobily/ts-belt";

export interface LanguageFieldProps {
  id?: string;
  value: Locale;
  onChange: (locale: Locale) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The one language picker, used on the first run and in settings. Each
 * language names itself, so a reader who cannot read the current one still
 * finds theirs.
 */
export function LanguageField(props: LanguageFieldProps) {
  const { t } = useTranslation("settings");

  return (
    <Select
      items={A.map(LOCALES, (locale) => ({ value: locale, label: LOCALE_NAMES[locale] }))}
      value={props.value}
      disabled={props.disabled}
      onValueChange={(value) => {
        if (isLocale(value)) props.onChange(value);
      }}
    >
      <SelectTrigger id={props.id} className={props.className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t("language.selectLabel")}</SelectLabel>
          {A.map(LOCALES, (locale) => (
            <SelectItem key={locale} value={locale}>
              <span className="flex flex-col">
                <span>{LOCALE_NAMES[locale]}</span>
                <SelectItemDescription>{LOCALE_TAGLINES[locale]}</SelectItemDescription>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
