import { type RefObject, useEffect, useRef, useState } from "react";
import { match } from "ts-pattern";

export interface Stuck<T extends HTMLElement> {
  /** Put this on the sticky element itself. */
  bar: RefObject<T | null>;
  /** True while the sticky element floats over the content behind it. */
  stuck: boolean;
}

/**
 * Tells a sticky element when it has left its place in the flow, so it can
 * draw a separator only while it floats.
 *
 * The element watches itself: the window is trimmed to one pixel below where
 * the element comes to rest, so the element is whole until it sticks and
 * clipped the moment it does. The offset comes from its own computed `top`,
 * so a bar that rests under a header on wide screens and at the very top on
 * narrow ones needs no breakpoint arithmetic here.
 */
export function useStuck<T extends HTMLElement>(): Stuck<T> {
  const bar = useRef<T | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = bar.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    let observer: IntersectionObserver | null = null;

    const watch = () => {
      observer?.disconnect();

      const top = Number.parseFloat(getComputedStyle(node).top);
      const offset = match(Number.isFinite(top))
        .with(true, () => top)
        .otherwise(() => 0);

      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) setStuck(entry.intersectionRatio < 1);
        },
        { rootMargin: `-${offset + 1}px 0px 0px 0px`, threshold: [1] },
      );
      observer.observe(node);
    };

    watch();
    window.addEventListener("resize", watch);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", watch);
    };
  }, []);

  return { bar, stuck };
}
