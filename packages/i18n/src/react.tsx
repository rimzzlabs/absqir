import type { ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { match, P } from "ts-pattern";
import { i18nFor, type Translate, translatorFor } from "#src/index";
import { DEFAULT_LOCALE, isLocale, type Locale } from "#src/locales";

export { Trans } from "react-i18next";

export interface I18nProviderProps {
  locale: Locale;
  children: ReactNode;
}

/**
 * Puts one language in reach of every island under it. Each island is its
 * own React root, so the language arrives as a prop from the page rather
 * than from a context the shell holds.
 */
export function I18nProvider(props: I18nProviderProps) {
  return <I18nextProvider i18n={i18nFor(props.locale)}>{props.children}</I18nextProvider>;
}

/** The language the surrounding island reads in. */
export function useLocale(): Locale {
  const { i18n } = useTranslation();
  const base = i18n.language.split("-")[0] ?? "";

  return match(base)
    .with(P.when(isLocale), (base) => base)
    .otherwise(() => DEFAULT_LOCALE);
}

/**
 * The reader for every message, whatever namespace it lives in. One hook and
 * one shape of key, `t("events:title")`, so a helper that takes a translator
 * takes the same type wherever it is called from.
 */
export function useTranslate(): Translate {
  return translatorFor(useLocale());
}
