import { useSyncExternalStore } from "react";
import {
  type MotionPreference,
  readMotion,
  readTheme,
  subscribePreferences,
  type ThemePreference,
} from "@/lib/preferences";

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribePreferences, readTheme, () => "system");
}

export function useMotionPreference(): MotionPreference {
  return useSyncExternalStore(subscribePreferences, readMotion, () => "system");
}
