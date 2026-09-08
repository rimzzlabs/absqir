/** Mirrors toSlug in packages/api, so the preview matches what the server accepts. */
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
