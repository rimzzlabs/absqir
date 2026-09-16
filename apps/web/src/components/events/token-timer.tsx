import { millisecondsUntil } from "@absqir/core/date";
import { useTranslate } from "@absqir/i18n/react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/use-preferences";

export interface TokenTimerProps {
  /** When this token stops working, as an ISO instant. */
  expiresAt: string;
}

function secondsLeft(expiresAt: string): number {
  return Math.ceil(millisecondsUntil(new Date(expiresAt)) / 1000);
}

/**
 * The seconds left, in words. A reader who turned animation off gets this
 * instead of the bar.
 *
 * The tick lives in this component and nowhere else, so the second that
 * passes re-renders one line rather than the whole room screen.
 */
function TokenSeconds(props: TokenTimerProps) {
  const t = useTranslate();
  const [left, setLeft] = useState(() => secondsLeft(props.expiresAt));

  useEffect(() => {
    setLeft(secondsLeft(props.expiresAt));
    const tick = setInterval(() => setLeft(secondsLeft(props.expiresAt)), 1000);

    return () => clearInterval(tick);
  }, [props.expiresAt]);

  return (
    <p className="text-muted-foreground text-sm tabular-nums">
      {t("events:display.codeChangesIn", { count: left })}
    </p>
  );
}

/**
 * How long the code on the room screen still works. A person reading it from
 * across the room can tell a code that has a while to run from one about to
 * turn over, and waits the beat out instead of scanning a code that dies
 * mid-scan.
 *
 * The bar carries no words, so a screen reader is told to skip it. A reader
 * who turned animation off gets the seconds in text instead.
 */
export function TokenTimer(props: TokenTimerProps) {
  const reduced = useReducedMotion();

  if (reduced) return <TokenSeconds expiresAt={props.expiresAt} />;

  return (
    <div aria-hidden className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
      {/*
        The key restarts the run: a new token mounts a new element, and the
        browser plays the keyframes from the top. The duration is what this
        token has left, never the whole window, because the window is cut to
        the clock and a screen opens partway through one.
      */}
      <div
        key={props.expiresAt}
        className="token-drain bg-primary h-full w-full origin-left"
        style={{ animationDuration: `${millisecondsUntil(new Date(props.expiresAt))}ms` }}
      />
    </div>
  );
}
