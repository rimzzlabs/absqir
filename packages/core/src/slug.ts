/**
 * What a slug field accepts while the reader types.
 *
 * A slug carries letters, digits and hyphens. The field keeps those and
 * drops every other symbol as it arrives, so an address never holds a
 * character the server refuses.
 *
 * A hyphen reaches the value two ways: a space becomes one, or the reader
 * types one. Both follow the same rule, because neither may open the slug
 * nor double a hyphen already at the end.
 *
 * A trailing hyphen stays, because a reader on the way to `acme-corp` types
 * one. The schema refuses it at the end, and `toSlug` trims it when the name
 * fills the field.
 */

/** The letters and digits a slug carries. */
const KEEP = /[a-z0-9]/;

/** A hyphen arrives from a space, from a tab, or from the key itself. */
const HYPHEN = /[\s-]/;

/** The accents NFKD splits off, such as the one over the e in Café. */
const MARKS = /[̀-ͯ]/g;

/**
 * The slug the reader has typed so far. An accented letter loses the accent,
 * a capital drops to lower case, and everything the slug cannot carry falls
 * away. So `Café & Co` reads `cafe-co`, and neither a space nor a hyphen on
 * an empty field opens the slug with one.
 */
export function toSlugDraft(value: string): string {
  let slug = "";

  for (const character of value.normalize("NFKD").replaceAll(MARKS, "").toLowerCase()) {
    if (KEEP.test(character)) {
      slug += character;
      continue;
    }

    // A symbol the slug cannot carry, such as & or !.
    if (!HYPHEN.test(character)) continue;

    // A hyphen that would open the slug, or follow the hyphen already there.
    if (slug === "" || slug.endsWith("-")) continue;

    slug += "-";
  }

  return slug;
}
