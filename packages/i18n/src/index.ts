import { createInstance, type i18n as I18nInstance, type TFunction } from "i18next";
import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from "#src/locales";
import { type Messages, messages } from "#src/messages/index";

export type { TFunction } from "i18next";
export * from "#src/locales";
export type { Messages } from "#src/messages/index";

/**
 * Makes every message key known to the type checker. A key that no catalog
 * carries fails the build instead of printing itself to the reader.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: Messages;
  }
}

/**
 * One instance per language, built once and never changed after. A shared
 * instance whose language the server switched per request would hand the
 * wrong words to whichever request read it next.
 */
const instances = new Map<Locale, I18nInstance>();

/**
 * Every namespace, in one tuple. The translator binds all of them, so one
 * shape of key, `t("events:title")`, works wherever it is read.
 */
export const NAMESPACES = [
  "common",
  "shell",
  "auth",
  "onboarding",
  "join",
  "home",
  "events",
  "checkin",
  "calendar",
  "reports",
  "schedules",
  "groups",
  "settings",
  "account",
  "notifications",
  "my",
  "invite",
  "leave",
  "publicEvent",
  "email",
  "errors",
] as const;

export type Namespaces = typeof NAMESPACES;

/** A reader for every message in one language. */
export type Translate = TFunction<Namespaces>;

export function i18nFor(locale: Locale): I18nInstance {
  const known = instances.get(locale);
  if (known) return known;

  const instance = createInstance({
    lng: LOCALE_TAGS[locale],
    fallbackLng: LOCALE_TAGS[DEFAULT_LOCALE],
    // Bahasa Indonesia has no separate plural form, so "id-ID" must fall back
    // to "id" and then to English, never straight past its own catalog.
    supportedLngs: [LOCALE_TAGS.id, "id", LOCALE_TAGS.en, "en"],
    nonExplicitSupportedLngs: true,
    defaultNS: "common",
    ns: [...NAMESPACES],
    resources: {
      en: messages.en,
      id: messages.id,
    },
    // React escapes what it renders, so a second pass would show &#39; to the
    // reader instead of an apostrophe.
    interpolation: { escapeValue: false },
    // i18next greets the console on the first init. A self-host reading its
    // own Worker log has not asked for an advertisement.
    showSupportNotice: false,
    returnNull: false,
  });

  instance.init();
  instances.set(locale, instance);

  return instance;
}

/**
 * Every message a notification row can name. The row keeps the key and the
 * values, so the words are made when somebody reads them, in whatever
 * language that reader has chosen by then.
 */
export const NOTIFY_KEYS = [
  "email:notify.reminderHour",
  "email:notify.reminderDay",
  "email:notify.when",
  "email:notify.eventClosed",
  "email:notify.eventClosedBody",
  "email:notify.leaveRequested",
  "email:notify.leaveApproved",
  "email:notify.leaveDeclined",
  "email:notify.leaveApprovedBody",
  "email:notify.leaveDeclinedBody",
  "email:notify.joinRequested",
  "email:notify.joinApproved",
  "email:notify.joinDeclined",
  "email:notify.joinApprovedBody",
  "email:notify.joinDeclinedBody",
  "email:notify.checkInReported",
  "email:notify.checkInDecidedApproved",
  "email:notify.checkInDecidedDeclined",
  "email:notify.checkInApprovedBody",
  "email:notify.checkInDeclinedBody",
] as const;

export type NotifyKey = (typeof NOTIFY_KEYS)[number];

export function isNotifyKey(value: unknown): value is NotifyKey {
  return typeof value === "string" && (NOTIFY_KEYS as readonly string[]).includes(value);
}

/**
 * The message reader for one language, outside React: an Astro page, an
 * email, an API answer. `t("events:title")` names the namespace up front.
 */
export function translatorFor(locale: Locale): Translate {
  return i18nFor(locale).getFixedT(LOCALE_TAGS[locale], NAMESPACES);
}
