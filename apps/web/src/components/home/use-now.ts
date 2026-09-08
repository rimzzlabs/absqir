import { useSyncExternalStore } from "react";

const MINUTE_MS = 60_000;

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, MINUTE_MS / 2);
  return () => clearInterval(timer);
}

function minuteNow() {
  return Math.floor(Date.now() / MINUTE_MS);
}

function minuteOnServer() {
  return null;
}

/**
 * The reader's clock to the minute, null until the island hydrates. The server
 * does not know the reader's timezone, so the first paint carries no time and
 * hydration has nothing to disagree about.
 */
export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, minuteNow, minuteOnServer);
  return minute === null ? null : new Date(minute * MINUTE_MS);
}

export function greetingFor(now: Date | null): string {
  if (!now) return "Hello";

  const hour = now.getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";

  return "Good night";
}
