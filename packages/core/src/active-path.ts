/**
 * Which navigation entry the reader is standing on.
 *
 * An address covers a page when it names the page or an ancestor of it, so
 * /events still lights up on /events/abc. That rule alone lights two entries
 * whenever one address is a prefix of another, which is why the sidebar asks
 * for the longest cover rather than every cover.
 */

/** True when `href` names `currentPath`, or an ancestor of it. */
export function isActivePath(href: string, currentPath: string): boolean {
  // The root is an ancestor of everything, so it only ever matches itself.
  if (href === "/") return currentPath === "/";

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

/**
 * The one address that owns `currentPath`: the longest of `hrefs` that
 * covers it. Null when none of them do.
 */
export function activeHref(hrefs: readonly string[], currentPath: string): string | null {
  let longest: string | null = null;

  for (const href of hrefs) {
    if (!isActivePath(href, currentPath)) continue;
    if (longest === null || href.length > longest.length) longest = href;
  }

  return longest;
}

export interface ActiveNavHrefParams {
  hrefs: readonly string[];
  currentPath: string;
  /**
   * The dashboard address, such as `/` or `/acme`. It is an ancestor of
   * every page under it, so without this rule it would be the entry left
   * lit on every page that has no entry of its own.
   */
  home: string;
}

/** The sidebar entry the reader is standing on, with the dashboard rule. */
export function activeNavHref(params: ActiveNavHrefParams): string | null {
  const found = activeHref(params.hrefs, params.currentPath);

  if (found === params.home && params.currentPath !== params.home) return null;

  return found;
}
