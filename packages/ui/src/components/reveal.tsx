"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { match } from "ts-pattern";

export interface RevealProps {
  children: ReactNode;
  /** Seconds to wait before the animation starts. */
  delay?: number;
  className?: string;
}

/**
 * The house entrance animation. When the reader asks for less motion the
 * element still appears, it just does not travel.
 */
export function Reveal(props: RevealProps) {
  const { children, delay = 0, className } = props;
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={match(Boolean(reduced))
        .with(true, () => ({ opacity: 0 }))
        .otherwise(() => ({ opacity: 0, y: 8 }))}
      animate={match(Boolean(reduced))
        .with(true, () => ({ opacity: 1 }))
        .otherwise(() => ({ opacity: 1, y: 0 }))}
      transition={{
        duration: match(Boolean(reduced))
          .with(true, () => 0.15)
          .otherwise(() => 0.35),
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
