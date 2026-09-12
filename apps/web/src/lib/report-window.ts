import { endOfDay, startOfDay, startOfMonth, subDays } from "@absqir/core/date";

export type RangePreset = "7d" | "30d" | "month" | "custom";

/**
 * Whole days in the reader's own timezone; the API takes absolute instants.
 * It lives apart from the range controls so the dashboard can name the same
 * window without pulling the pickers into its bundle.
 */
export function presetRange(preset: RangePreset, now: Date = new Date()) {
  if (preset === "month") return { from: startOfMonth(now), to: endOfDay(now) };
  if (preset === "30d") return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };

  return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
}
