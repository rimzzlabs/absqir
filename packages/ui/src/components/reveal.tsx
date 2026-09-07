"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

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
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
