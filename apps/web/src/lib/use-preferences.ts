import { useSyncExternalStore } from "react";
import { match } from "ts-pattern";
import {
  type MotionPreference,
  readMotion,
  readTheme,
  subscribePreferences,
  type ThemePreference,
} from "@/lib/preferences";

const LESS_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeSystemMotion(onChange: () => void): () => void {
  const query = window.matchMedia(LESS_MOTION);
  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
}

function readSystemMotion(): boolean {
  return window.matchMedia(LESS_MOTION).matches;
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribePreferences, readTheme, () => "system");
}

export function useMotionPreference(): MotionPreference {
  return useSyncExternalStore(subscribePreferences, readMotion, () => "system");
}

/**
 * Whether this reader gets less motion, by the same rule the CSS in
 * packages/ui follows: "off" always, "on" never, and "system" asks the
 * device. A component reads this to answer in words what it would otherwise
 * answer with a moving part.
 */
export function useReducedMotion(): boolean {
  const motion = useMotionPreference();
  const system = useSyncExternalStore(subscribeSystemMotion, readSystemMotion, () => false);

  return match(motion)
    .with("off", () => true)
    .with("on", () => false)
    .otherwise(() => system);
}
