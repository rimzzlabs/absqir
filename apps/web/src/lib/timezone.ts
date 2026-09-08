import { setDisplayTimezoneResolver } from "@absqir/core/date";

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

setDisplayTimezoneResolver(pageTimezone);
