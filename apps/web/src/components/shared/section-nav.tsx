import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import type { Icon } from "@phosphor-icons/react";
import { type MouseEvent, useEffect, useRef } from "react";
import { match } from "ts-pattern";

export interface SectionNavItem<TValue extends string> {
  value: TValue;
  /** Worded by the caller, which knows the reader's language. */
  label: string;
  icon: Icon;
}

export interface SectionNavGroup<TValue extends string> {
  /** Null on a page whose sections need no heading above them. */
  label: string | null;
  items: SectionNavItem<TValue>[];
}

export interface SectionNavProps<TValue extends string> {
  /** Names the whole list for a screen reader. */
  label: string;
  groups: SectionNavGroup<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
}

/**
 * The sections of a settings-shaped page. A column on a wide screen, one
 * scrolling row on a phone. Every entry is a real link, so it opens in a
 * new tab and the address bar carries the section.
 *
 * The column stops below the app bar, not at the top of the window. The bar
 * sticks there from `md` up, so a column that stopped at the window edge
 * would slide its first entry under the bar.
 */
export function SectionNav<TValue extends string>(props: SectionNavProps<TValue>) {
  const list = useRef<HTMLElement>(null);
  const { value } = props;

  // On a phone the row scrolls, so the chosen section has to come into view.
  // The offset is set by hand, because the first render is the server's
  // and the address bar only wins after hydration.
  useEffect(() => {
    const nav = list.current;
    const link = nav?.querySelector<HTMLAnchorElement>(`a[href="?tab=${value}"]`);
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return;

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    nav.scrollLeft += linkRect.left - navRect.left - (navRect.width - linkRect.width) / 2;
  }, [value]);

  const choose = (event: MouseEvent<HTMLAnchorElement>, value: TValue) => {
    // A modified click keeps its browser meaning: a new tab, a new window.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    props.onChange(value);
  };

  return (
    <nav
      ref={list}
      aria-label={props.label}
      className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:sticky lg:top-[calc(var(--app-bar-height)+--spacing(6))] lg:mx-0 lg:flex-col lg:gap-6 lg:self-start lg:overflow-visible lg:px-0"
    >
      {A.mapWithIndex(props.groups, (index, group) => (
        <div key={group.label ?? index} className="flex shrink-0 gap-1 lg:flex-col">
          {match(group.label)
            .with(null, () => null)
            .otherwise((label) => (
              <p className="text-muted-foreground hidden px-3 pb-1 text-xs font-medium tracking-wide uppercase lg:block">
                {label}
              </p>
            ))}
          {A.map(group.items, (item) => {
            const active = item.value === value;

            return (
              <a
                key={item.value}
                href={`?tab=${item.value}`}
                aria-current={match(active)
                  .with(true, () => "page" as const)
                  .otherwise(() => undefined)}
                onClick={(event) => choose(event, item.value)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  match(active)
                    .with(true, () => "bg-muted text-foreground font-medium" as const)
                    .otherwise(
                      () =>
                        "text-muted-foreground hover:bg-muted/60 hover:text-foreground" as const,
                    ),
                )}
              >
                <item.icon
                  weight={match(active)
                    .with(true, () => "fill" as const)
                    .otherwise(() => "regular" as const)}
                  className={cn(
                    "size-4 shrink-0",
                    match(active)
                      .with(true, () => "text-primary" as const)
                      .otherwise(() => "" as const),
                  )}
                />
                {item.label}
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
