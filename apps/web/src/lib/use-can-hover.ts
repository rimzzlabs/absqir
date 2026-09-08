import { useSyncExternalStore } from "react";

const QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** True with a mouse or trackpad. False on a phone, and on the server. */
export function useCanHover(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
