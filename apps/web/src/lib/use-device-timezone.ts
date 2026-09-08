import { deviceTimezone } from "@absqir/core/timezone";
import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function onServer() {
  return null;
}

/**
 * The browser's own zone, null until the island hydrates. The server renders
 * in its own zone, so naming the device's one there would disagree with the
 * client and fail hydration.
 */
export function useDeviceTimezone(): string | null {
  return useSyncExternalStore(subscribe, deviceTimezone, onServer);
}
