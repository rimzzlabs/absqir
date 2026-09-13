import { useEffect, useRef } from "react";

/**
 * Asks for the location permission before it is needed.
 *
 * The room screen's code lives for 20 seconds, and the server accepts one
 * window behind it, so a scan has about 40 seconds to reach the server. The
 * first time a member checks in at a fenced event, the browser opens a
 * permission prompt, and a prompt can easily sit unanswered for longer than
 * that. The scan would then be refused for an expired token, through no
 * fault of the member.
 *
 * So the prompt is raised while they are still walking up to the screen. The
 * answer is remembered by the browser, and the reading itself then takes a
 * few seconds, well inside the window.
 *
 * It asks only when an event the member can check in to right now wants a
 * location, and only when the permission has not been settled already.
 * Nobody is prompted for an event that never asks.
 */
export function useWarmLocation(needed: boolean): void {
  const asked = useRef(false);

  useEffect(() => {
    if (!needed || asked.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (!window.isSecureContext) return;

    asked.current = true;

    const warm = () => {
      // The result is thrown away. Only the permission matters here, and the
      // check-in takes its own fresh burst when the time comes.
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {},
        { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
      );
    };

    // A browser with no Permissions API simply gets the prompt.
    if (!navigator.permissions?.query) {
      warm();
      return;
    }

    void navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        // `granted` needs no prompt, and `denied` must not be nagged: only
        // the browser's own settings can undo it.
        if (status.state === "prompt") warm();
      })
      .catch(() => warm());
  }, [needed]);
}
