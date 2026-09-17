import { useStuck } from "@absqir/ui/hooks/use-stuck";
import { cn } from "@absqir/ui/lib/utils";
import type { ReactNode } from "react";
import { match } from "ts-pattern";

export interface StickyToolbarProps {
  children: ReactNode;
  className?: string;
}

/**
 * The bar above a list, which follows the reader down it.
 *
 * Sticky alone is not enough. The bar carries its own background, so the
 * cards pass behind it and stay legible, and its own padding, so the
 * controls are not jammed against them. The negative margins cancel the
 * page padding, because a background that stops short of the gutter lets
 * the list show through at both edges.
 *
 * It rests at the top on a phone, where the app bar sits at the bottom, and
 * under the header on a wider screen. The separator belongs to the bar only
 * while it floats: at rest it would be one more rule on a page that already
 * has enough.
 *
 * It must be a direct child of the tall container it travels down. Wrapped
 * in a box its own size, it stops after a few pixels.
 */
export function StickyToolbar(props: StickyToolbarProps) {
  const { bar, stuck } = useStuck<HTMLDivElement>();

  return (
    <div
      ref={bar}
      className={cn(
        "bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b px-4 py-3 backdrop-blur transition-colors md:-mx-6 md:top-(--app-bar-height) md:px-6",
        match(stuck)
          .with(true, () => "border-border" as const)
          .otherwise(() => "border-transparent" as const),
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
