import { useCallback, useEffect, useState } from "react";

export interface Cooldown {
  /** Seconds left. Zero once the wait is over. */
  remaining: number;
  ready: boolean;
  restart: () => void;
}

/**
 * Counts down to zero, and starts again on demand. The code steps use it so a
 * reader can see when a new code can be asked for, instead of pressing a link
 * that the server rate limit silently drops.
 */
export function useCooldown(seconds: number): Cooldown {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;

    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const restart = useCallback(() => setRemaining(seconds), [seconds]);

  return { remaining, ready: remaining <= 0, restart };
}
