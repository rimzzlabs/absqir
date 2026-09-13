import { A, O, pipe } from "@mobily/ts-belt";
import { match, P } from "ts-pattern";

/**
 * The languages absqir speaks. English is the fallback: every key exists in
 * it, so a message that a translator has not reached yet still reads.
 */
export const LOCALES = ["en", "id"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && A.includes(LOCALES, value as Locale);
}

/** What each language calls itself, for a picker that anybody can read. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

/** The English name, for a line that already reads in one language. */
export const LOCALE_ENGLISH_NAMES: Record<Locale, string> = {
  en: "English",
  id: "Indonesian",
};

/**
 * One line about each language, written in that language. A picker that
 * describes English in Indonesian helps nobody choose.
 */
export const LOCALE_TAGLINES: Record<Locale, string> = {
  en: "Every screen, every email, in English.",
  id: "Setiap layar dan setiap email dalam Bahasa Indonesia.",
};

/** A short mark for a tight control, such as the switch in the header. */
export const LOCALE_SHORT_NAMES: Record<Locale, string> = {
  en: "EN",
  id: "ID",
};

/**
 * The language tag a locale formats dates and numbers with. Indonesian reads
 * best with the Indonesian region, so months and money follow that place.
 */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en",
  id: "id-ID",
};

/** "id-ID", "ID" and "id" all mean Indonesian. Anything else means null. */
function matchLocale(tag: string): Locale | null {
  const base = tag.trim().toLowerCase().split("-")[0] ?? "";

  return match(base)
    .with(P.when(isLocale), (locale) => locale)
    .otherwise(() => null);
}

/**
 * The first language of an Accept-Language header that absqir speaks, in the
 * order the browser asks for. Null when it asks for none of them.
 */
export function localeFromHeader(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const wanted = pipe(
    header.split(","),
    A.map((part) => {
      const [tag = "", ...params] = part.split(";");
      const quality = pipe(
        A.getBy(params, (param) => param.trim().startsWith("q=")),
        O.mapWithDefault(1, (param) => Number(param.trim().slice(2))),
      );

      return {
        tag: tag.trim(),
        quality: match(quality)
          .with(P.number.finite(), (quality) => quality)
          .otherwise(() => 0),
      };
    }),
    A.reject((entry) => entry.quality <= 0 || entry.tag.length === 0),
    A.sortBy((entry) => -entry.quality),
  );

  return pipe(
    A.filterMap(wanted, (entry) => O.fromNullable(matchLocale(entry.tag))),
    A.head,
    O.toNullable,
  );
}

/** The language this browser reads in, or null when it names another one. */
export function deviceLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;

  return pipe(
    A.filterMap(navigator.languages ?? [navigator.language], (tag) =>
      O.fromNullable(matchLocale(tag)),
    ),
    A.head,
    O.toNullable,
  );
}
