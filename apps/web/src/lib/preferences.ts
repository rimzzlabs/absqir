/**
 * Per-browser choices: theme and animation. They live in localStorage, not
 * on the account, because a phone and a projector want different answers.
 * The inline script in layout.astro reads the same keys before first paint.
 */
export type ThemePreference = "system" | "light" | "dark";
export type MotionPreference = "system" | "on" | "off";

const THEME_KEY = "theme";
const MOTION_KEY = "motion";
const EVENT = "absqir:preferences";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked. The choice still applies to this page.
  }
}

export function readTheme(): ThemePreference {
  const value = read(THEME_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

export function readMotion(): MotionPreference {
  const value = read(MOTION_KEY);
  return value === "on" || value === "off" ? value : "system";
}

function applyTheme(theme: ThemePreference) {
  const dark =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

function applyMotion(motion: MotionPreference) {
  const root = document.documentElement;
  root.classList.toggle("motion-on", motion === "on");
  root.classList.toggle("motion-off", motion === "off");
}

export function setTheme(theme: ThemePreference) {
  write(THEME_KEY, theme === "system" ? null : theme);
  applyTheme(theme);
  window.dispatchEvent(new Event(EVENT));
}

export function setMotion(motion: MotionPreference) {
  write(MOTION_KEY, motion === "system" ? null : motion);
  applyMotion(motion);
  window.dispatchEvent(new Event(EVENT));
}

/** Fires on a change in this tab, and on one made in another tab. */
export function subscribePreferences(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
