/**
 * The brand palette from apps/docs/src/pages/brand.mdx, written as literal
 * hex. Mail clients read no CSS variables and no oklch, so the tokens the
 * app keeps in globals.css cannot travel. This file is their one translation.
 */
export const color = {
  ink: "#131A26",
  inkDark: "#E7ECF4",
  paper: "#F6F8FB",
  paperDark: "#10151E",
  cobalt: "#2563EB",
  cobaltDark: "#7CA9FF",
  card: "#FFFFFF",
  cardDark: "#171E2A",
  border: "#DFE5EE",
  borderDark: "#232C3A",
  muted: "#5B6678",
  mutedDark: "#9AA6B8",
} as const;

/**
 * Outlook for Windows renders through Word, which knows neither `system-ui`
 * nor the generic `sans-serif`. Both stacks name real faces first and end on
 * Arial, so every client lands on something the reader has.
 */
export const font = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", monospace',
} as const;

/** The card and the bars above and below it share one measure. */
export const CONTENT_WIDTH = 600;
