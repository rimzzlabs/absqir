import { buttonVariants } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export interface BackLinkProps {
  /** Where the reader goes back to. */
  href: string;
  /** The name of that place, for example "My events". */
  children: ReactNode;
  className?: string;
}

/**
 * The one way back, on every page that has one. A real button with a real
 * icon: the old "←" was a text arrow in a link that looked like body copy.
 * The arrow slides a little on hover, so the target reads before the click.
 */
export function BackLink(props: BackLinkProps) {
  return (
    <a
      href={props.href}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "text-muted-foreground hover:text-foreground gap-1.5 pl-2",
        props.className,
      )}
    >
      <ArrowLeftIcon
        aria-hidden
        className="transition-transform duration-200 ease-out group-hover/button:-translate-x-0.5"
      />
      {props.children}
    </a>
  );
}
