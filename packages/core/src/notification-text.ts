import { isNotifyKey, type Locale, type NotifyKey, type Translate } from "@absqir/i18n";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { enUS, id } from "date-fns/locale";
import { match, P } from "ts-pattern";
import { displayLocale } from "#src/date";

/** What a notification row carries, as far as its words are concerned. */
export interface NotificationText {
  /** The words as they stood when the row was written. */
  title: string;
  body: string | null;
  /** The key the words are made from now. Null on a row written before. */
  titleKey: string | null;
  titleParams: Record<string, string | number> | null;
  /** Null when the body is somebody's own words: a reason, a note. */
  bodyKey: string | null;
  bodyParams: Record<string, string | number> | null;
}

export interface NotificationTextOptions {
  /** The zone to read the times in. The row's own zone when absent. */
  timezone?: string | null;
  /**
   * The language the month names follow. The display language when absent,
   * which is what a page wants; a server that words one message for one
   * reader passes that reader's own.
   */
  locale?: Locale;
}

/** The reminder says when, which is a date in a zone rather than a word. */
const WHEN: NotifyKey = "email:notify.when";

const DATE_FNS_LOCALES = { en: enUS, id } as const;

/**
 * The line under a reminder: "Mon 14 Sep, 01:15 to 03:00 (Asia/Jakarta)".
 * The instants are stored raw, so the zone and the month names both follow
 * the reader rather than whoever the row was written for.
 */
function whenLine(
  t: Translate,
  params: Record<string, string | number>,
  zone: string,
  locale: Locale,
): string {
  const start = new TZDate(new Date(String(params.startsAt)), zone);
  const end = new TZDate(new Date(String(params.endsAt)), zone);
  const names = DATE_FNS_LOCALES[locale];

  return t("email:notify.when", {
    start: format(start, "EEE d MMM, HH:mm", { locale: names }),
    end: format(end, "HH:mm", { locale: names }),
    timezone: zone,
  });
}

function render(
  t: Translate,
  key: string | null,
  params: Record<string, string | number> | null,
  fallback: string,
  options?: NotificationTextOptions,
): string {
  if (!isNotifyKey(key)) return fallback;

  const values = params ?? {};

  if (key === WHEN) {
    const zone = options?.timezone ?? String(values.timezone ?? "UTC");
    return whenLine(t, values, zone, options?.locale ?? displayLocale());
  }

  // The key and its values both come out of the database, so nothing here
  // can prove to the type checker that they belong together. The guard
  // above proves the key is one absqir writes, and a value the message does
  // not name is simply left out of it.
  return String(t(key, values as never));
}

/** The title of one notification, in the language of whoever reads it. */
export function notificationTitle(t: Translate, row: NotificationText): string {
  return render(t, row.titleKey, row.titleParams, row.title);
}

/** The body, or null when the row has none. */
export function notificationBody(
  t: Translate,
  row: NotificationText,
  options?: NotificationTextOptions,
): string | null {
  return match(row.bodyKey)
    .with(P.string, (key) => render(t, key, row.bodyParams, row.body ?? "", options))
    .otherwise(() => row.body ?? null);
}
