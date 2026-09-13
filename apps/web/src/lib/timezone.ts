import { setDisplayLocaleResolver, setDisplayTimezoneResolver } from "@absqir/core/date";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@absqir/i18n";
import { match, P } from "ts-pattern";

/**
 * The account's zone rides on the page as `<html data-timezone>`, written by
 * the layout from the signed-in user. Reading it from the markup means the
 * first paint already uses it, whatever island hydrates first, and a
 * changed choice takes effect with the reload that follows the save.
 */
function pageTimezone(): string | null {
  if (typeof document === "undefined") return null;

  return document.documentElement.dataset.timezone || null;
}

/**
 * The language rides on the same element, as `<html lang>`, so the month
 * names and the weekday names follow whatever the page reads in.
 */
function pageLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  return match(document.documentElement.lang)
    .with(P.when(isLocale), (locale) => locale)
    .otherwise(() => DEFAULT_LOCALE);
}

setDisplayTimezoneResolver(pageTimezone);
setDisplayLocaleResolver(pageLocale);
