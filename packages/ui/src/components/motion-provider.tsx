"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export interface MotionProviderProps {
  children: ReactNode;
}

/**
 * Wrap every island that animates. `reducedMotion: "user"` makes each motion
 * component follow the operating system setting, which pairs with the
 * prefers-reduced-motion block in globals.css for plain CSS transitions.
 */
export function MotionProvider(props: MotionProviderProps) {
  return <MotionConfig reducedMotion="user">{props.children}</MotionConfig>;
}
