/**
 * A link that covers its whole parent through a pseudo-element. The parent
 * needs `relative`, and any control beside the link needs `relative z-10` to
 * stay reachable.
 */
export const STRETCHED_LINK =
  "min-w-0 text-left outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-3 focus-visible:after:ring-ring/50";
