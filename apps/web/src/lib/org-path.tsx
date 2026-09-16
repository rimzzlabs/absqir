import { orgPath } from "@absqir/core/org-path";
import { createContext, useContext } from "react";

/**
 * The organization the address names. Every island under an organization
 * page reads it from here, so a link never has to guess which organization
 * the reader is standing in.
 *
 * Null on a page that belongs to the account, such as settings, and on the
 * public pages, where no organization owns the view.
 */
const OrgSlugContext = createContext<string | null>(null);

export const OrgSlugProvider = OrgSlugContext.Provider;

/** The slug in the address, or null outside an organization page. */
export function useOrgSlug(): string | null {
  return useContext(OrgSlugContext);
}

/**
 * Builds an address inside the organization the reader is standing in, so
 * `orgHref("/events")` reads `/acme/events`.
 *
 * On a public page there is no slug to put in front, so every address comes
 * back as the root. The middleware sends the root to the dashboard of the
 * organization the reader last used, which is the nearest true answer.
 */
export function useOrgHref(): (path: string) => string {
  const slug = useOrgSlug();

  return (path) => {
    if (slug === null) return "/";

    return orgPath(slug, path);
  };
}
