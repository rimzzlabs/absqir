"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export interface MotionProviderProps {
  children: ReactNode;
  /**
   * "user" follows the operating system, "always" turns animation off, and
   * "never" keeps it on whatever the system says. The app maps its own
   * preference onto these.
   */
  reducedMotion?: "user" | "always" | "never";
}

/**
 * Wrap every island that animates. The default pairs with the
 * prefers-reduced-motion block in globals.css for plain CSS transitions.
 */
export function MotionProvider(props: MotionProviderProps) {
  return (
    <MotionConfig reducedMotion={props.reducedMotion ?? "user"}>{props.children}</MotionConfig>
  );
}
