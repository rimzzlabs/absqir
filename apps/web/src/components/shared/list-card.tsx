import { cn } from "@absqir/ui/lib/utils";
import type { ReactNode } from "react";
import { match } from "ts-pattern";
import { STRETCHED_LINK } from "@/components/shared/stretched-link";

export interface ListCardProps {
  /** The card opens something on a click, so it answers the pointer. */
  link?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * One row of a list, as a card. Every list of events, records, and history
 * rows is built from this, so they all carry the same padding, corner, and
 * ring.
 */
export function ListCard(props: ListCardProps) {
  return (
    <li
      className={cn(
        // No `overflow-hidden`: the title's focus ring draws outside the card,
        // and a clip would swallow it.
        "bg-card text-card-foreground ring-foreground/10 relative isolate flex min-w-0 gap-3 rounded-xl p-3 ring-1 sm:gap-4 sm:p-4",
        match(props.link ?? false)
          .with(true, () => "hover:bg-accent/40 transition-[box-shadow,background-color]" as const)
          .otherwise(() => "" as const),
        props.className,
      )}
    >
      {props.children}
    </li>
  );
}

export interface ListCardTitleProps {
  href: string;
  title: string;
  /** What sits at the end of the line, normally a status badge. */
  aside?: ReactNode;
}

/**
 * The first line of a card: the title, which covers the whole card, and a
 * badge beside it. Anything else that takes a click needs `relative z-10`.
 */
export function ListCardTitle(props: ListCardTitleProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <a
        href={props.href}
        className={cn(STRETCHED_LINK, "line-clamp-2 text-sm leading-snug font-medium")}
      >
        {props.title}
      </a>
      <span className="shrink-0">{props.aside}</span>
    </div>
  );
}
