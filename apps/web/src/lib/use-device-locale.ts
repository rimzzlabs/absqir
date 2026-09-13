import { deviceLocale, type Locale } from "@absqir/i18n";
import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function onServer() {
  return null;
}

/**
 * The language this browser asks for, null until the island hydrates. The
 * server renders for whoever asked, so naming the device's language there
 * would disagree with the client and fail hydration.
 */
export function useDeviceLocale(): Locale | null {
  return useSyncExternalStore(subscribe, deviceLocale, onServer);
}
