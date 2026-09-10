import { A } from "@mobily/ts-belt";

/**
 * An organization can claim the domain its people share, so a new account at
 * that domain finds its workspace on its own. A shared mailbox provider is
 * not a workspace: everybody at gmail.com would claim one organization. This
 * module decides which domains a claim may name, and lives outside the
 * database package so a browser island can use it too.
 */

/** The longest a domain name can be, by RFC 1035. */
const MAX_DOMAIN_LENGTH = 253;

/** One label: letters, digits and inner hyphens, at most 63 characters. */
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Mailbox providers and throwaway services. A domain on this list belongs to
 * its provider, never to one organization. The list covers what people
 * actually sign up with; it is not, and cannot be, complete. An instance that
 * meets one this list misses can still refuse the claim by hand.
 */
export const PUBLIC_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  // Google
  "gmail.com",
  "googlemail.com",
  // Microsoft
  "outlook.com",
  "outlook.co.uk",
  "outlook.de",
  "outlook.es",
  "outlook.fr",
  "outlook.it",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.de",
  "hotmail.es",
  "hotmail.fr",
  "hotmail.it",
  "live.com",
  "live.co.uk",
  "live.fr",
  "live.nl",
  "msn.com",
  "passport.com",
  // Yahoo
  "yahoo.com",
  "yahoo.ca",
  "yahoo.co.jp",
  "yahoo.co.uk",
  "yahoo.com.br",
  "yahoo.de",
  "yahoo.es",
  "yahoo.fr",
  "yahoo.in",
  "yahoo.it",
  "ymail.com",
  "rocketmail.com",
  // Apple
  "icloud.com",
  "me.com",
  "mac.com",
  // Proton
  "proton.me",
  "protonmail.com",
  "protonmail.ch",
  "pm.me",
  // Other mailbox providers
  "aol.com",
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "mail.com",
  "mail.ru",
  "email.com",
  "hey.com",
  "fastmail.com",
  "fastmail.fm",
  "zoho.com",
  "zohomail.com",
  "tutanota.com",
  "tutanota.de",
  "tuta.io",
  "tutamail.com",
  "hushmail.com",
  "posteo.de",
  "mailbox.org",
  "runbox.com",
  "yandex.com",
  "yandex.ru",
  "inbox.lv",
  "seznam.cz",
  "web.de",
  "t-online.de",
  "freenet.de",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "sfr.fr",
  "laposte.net",
  "libero.it",
  "virgilio.it",
  "alice.it",
  "tiscali.it",
  "terra.com.br",
  "uol.com.br",
  "bol.com.br",
  "rediffmail.com",
  "qq.com",
  "foxmail.com",
  "163.com",
  "126.com",
  "sina.com",
  "sina.cn",
  "sohu.com",
  "aliyun.com",
  "naver.com",
  "daum.net",
  "hanmail.net",
  // Internet and telephone companies
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "cox.net",
  "charter.net",
  "bellsouth.net",
  "earthlink.net",
  "juno.com",
  "optonline.net",
  "shaw.ca",
  "rogers.com",
  "sympatico.ca",
  "telus.net",
  "btinternet.com",
  "sky.com",
  "virginmedia.com",
  "ntlworld.com",
  "talktalk.net",
  "blueyonder.co.uk",
  // Throwaway addresses
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "tempr.email",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "mintemail.com",
  "spamgourmet.com",
  "mailnesia.com",
  "moakt.com",
  "emailondeck.com",
  "fakeinbox.com",
  "mytemp.email",
  "duck.com",
]);

/**
 * A domain in the one spelling everything else compares against: lower case,
 * no surrounding space, no trailing dot, no scheme and no leading "@".
 * Returns null when the value is not a domain name at all.
 */
export function normalizeDomain(value: string): string | null {
  const trimmed = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");

  if (trimmed.length === 0 || trimmed.length > MAX_DOMAIN_LENGTH) return null;

  const labels = trimmed.split(".");

  // A bare host name and an IP address name no organization on the internet.
  if (labels.length < 2) return null;
  if (A.every(labels, (label) => /^\d+$/.test(label))) return null;
  if (!A.every(labels, (label) => LABEL.test(label))) return null;

  return trimmed;
}

/** The domain part of an address, normalized. Null when the address is not one. */
export function emailDomainOf(email: string): string | null {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at < 1) return null;

  const local = email.trim().slice(0, at);
  if (local.length === 0) return null;

  return normalizeDomain(email.trim().slice(at + 1));
}

/** True for a mailbox provider or a throwaway service. */
export function isPublicEmailDomain(value: string): boolean {
  const domain = normalizeDomain(value);
  return domain !== null && PUBLIC_EMAIL_DOMAINS.has(domain);
}

/**
 * True when an organization may claim this domain. A claim on a mailbox
 * provider would hand every account at that provider to one organization,
 * so it is refused.
 */
export function isClaimableDomain(value: string): boolean {
  const domain = normalizeDomain(value);
  return domain !== null && !PUBLIC_EMAIL_DOMAINS.has(domain);
}

/**
 * The claimable domain an address belongs to, or null. A claim matches the
 * whole domain only: kolosal.ai never matches mail.kolosal.ai, because a
 * subdomain can belong to someone else.
 */
export function claimableDomainOfEmail(email: string): string | null {
  const domain = emailDomainOf(email);
  return domain !== null && !PUBLIC_EMAIL_DOMAINS.has(domain) ? domain : null;
}

/** The host an organization puts the proof record on. */
export const DOMAIN_VERIFICATION_HOST = "_absqir";

/** The full host name of the TXT record for one domain. */
export function domainVerificationHost(domain: string): string {
  return `${DOMAIN_VERIFICATION_HOST}.${domain}`;
}

/** What the TXT record must carry, word for word. */
export function domainVerificationRecord(token: string): string {
  return `absqir-domain-verification=${token}`;
}
