import { LOCALE_TAGS } from "@absqir/i18n";
import { displayLocale } from "#src/date";

/**
 * A number as the reader's language writes it. English groups thousands
 * with a comma and marks the decimal with a point; Bahasa Indonesia does
 * the opposite, so 1.234,5 and 1,234.5 are the same number.
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE_TAGS[displayLocale()], options).format(value);
}

/**
 * A rate between 0 and 1 as a whole percent. Null means nothing was
 * measured, which is an em dash rather than a nought.
 */
export function formatPercent(rate: number | null): string {
  if (rate === null) return "—";

  return new Intl.NumberFormat(LOCALE_TAGS[displayLocale()], {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(rate);
}
