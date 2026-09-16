import { match, P } from "ts-pattern";

/**
 * The organization slug is the first segment of every organization address,
 * so `/acme/events` reads the events of `acme`. Two readers in two
 * organizations can then keep two tabs open, because the address says which
 * organization each tab shows.
 *
 * A slug sits at the root of the site, next to the addresses that belong to
 * the person and to the public. So a slug must never take a name one of
 * those already holds, which is what the reserved list below refuses.
 */

/**
 * Root addresses absqir serves itself. A slug that matched one of these
 * would hide the page, because a static route wins over `/[org]`.
 */
const TAKEN = ["account", "api", "invite", "onboarding", "settings", "sign-in", "sign-up"] as const;

/**
 * Names absqir holds for later. None of them serves a page today, and a
 * slug that took one would block the page the name is kept for.
 */
const HELD = [
  "about",
  "admin",
  "app",
  "assets",
  "billing",
  "blog",
  "changelog",
  "contact",
  "dashboard",
  "docs",
  "download",
  "help",
  "home",
  "legal",
  "login",
  "logout",
  "new",
  "organization",
  "organizations",
  "press",
  "pricing",
  "privacy",
  "public",
  "register",
  "root",
  "security",
  "signin",
  "signout",
  "signup",
  "static",
  "status",
  "support",
  "terms",
  "www",
] as const;

const RESERVED = new Set<string>([...TAKEN, ...HELD]);

/**
 * What absqir answers when a caller asks for a slug it keeps for itself.
 * Better Auth carries no code of its own for this, so the message is the
 * code: every caller matches on it to answer in the reader's language.
 */
export const SLUG_RESERVED = "SLUG_RESERVED";

/**
 * True when a failure says another organization already holds the slug.
 * Better Auth names it one way when an organization is created and another
 * way when one is renamed, and the reader has the same thing to fix either
 * way, so both codes live here rather than at each caller.
 */
export function isSlugTakenCode(code: string | null | undefined): boolean {
  return code === "ORGANIZATION_ALREADY_EXISTS" || code === "ORGANIZATION_SLUG_ALREADY_TAKEN";
}

/** True when absqir keeps `slug` for itself, so no organization can hold it. */
export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug.trim().toLowerCase());
}

/**
 * The address of `path` inside the organization `slug`. The path arrives the
 * way the sidebar writes it, with a leading slash, and `/` names the
 * dashboard.
 *
 * orgPath("acme", "/") is "/acme", and orgPath("acme", "/events") is
 * "/acme/events".
 */
export function orgPath(slug: string, path: string): string {
  return match(path)
    .with("", "/", () => `/${slug}`)
    .with(P.string.startsWith("/"), (tail) => `/${slug}${tail}`)
    .otherwise((tail) => `/${slug}/${tail}`);
}

/** An address split into the organization slug and the page under it. */
export interface OrgPathParts {
  slug: string;
  /** The page inside the organization, always with a leading slash. */
  rest: string;
}

/**
 * The slug and the page `path` names, or null when the address carries no
 * segment at all. The caller decides whether the slug names an organization
 * this reader belongs to.
 */
export function splitOrgPath(path: string): OrgPathParts | null {
  const trimmed = path.replace(/\/+$/, "");
  const parts = trimmed.split("/").filter((part) => part !== "");
  const [slug, ...tail] = parts;

  if (slug === undefined) return null;

  const rest = match(tail)
    .with([], () => "/")
    .otherwise((parts) => `/${parts.join("/")}`);

  return { slug, rest };
}

/** The single sign-in door. */
export const SIGN_IN_PATH = "/sign-in";

/**
 * Reachable without a session: the door itself, an invitation, and the
 * public face of an event.
 */
export function isPublicPath(path: string): boolean {
  return (
    path === SIGN_IN_PATH ||
    path === "/sign-up" ||
    path.startsWith("/invite/") ||
    path.startsWith("/e/")
  );
}

/**
 * Addresses that carry no organization slug, because they belong to the
 * person or to everyone. An account keeps one profile, one language, and
 * one set of devices across every organization it belongs to, so a slug in
 * front of the settings page would name an owner the page does not have.
 *
 * Every other address lives under `/<slug>`.
 */
export function isAccountPath(path: string): boolean {
  return (
    path === "/" ||
    path === "/settings" ||
    path === "/account" ||
    path === "/onboarding" ||
    path === "/no-organization" ||
    path === "/404" ||
    path === "/500" ||
    isPublicPath(path) ||
    // The address a check-in QR opens. The token in it names the event, and
    // the code is printed, so the address stays as short as it can be.
    path.startsWith("/a/")
  );
}

/**
 * Reachable by a signed-in reader who belongs to no organization yet. The
 * home page shows the steps that lead into one, and settings holds the
 * account's own profile, preferences, and devices.
 */
export function isOrgFreePath(path: string): boolean {
  return (
    path === "/" ||
    path === "/settings" ||
    path === "/account" ||
    path === "/onboarding" ||
    path.startsWith("/invite/") ||
    path.startsWith("/e/")
  );
}
