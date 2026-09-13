import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { i18nFor } from "#src/index";
import type { Locale } from "#src/locales";

export { Trans, useTranslation } from "react-i18next";

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
