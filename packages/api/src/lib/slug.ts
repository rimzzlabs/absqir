/** Lowercase, ASCII, hyphen separated, 2 to 40 characters. What an organization URL can carry. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/;

export function toSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replaceAll(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 40);
}

export function isSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}
