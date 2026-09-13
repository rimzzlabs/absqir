import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import type { Icon } from "@phosphor-icons/react";
import { type MouseEvent, useEffect, useRef } from "react";
import { match } from "ts-pattern";

export interface SettingsNavItem<TValue extends string> {
  value: TValue;
  label: string;
  icon: Icon;
}

export interface SettingsNavGroup<TValue extends string> {
  label: string;
  items: SettingsNavItem<TValue>[];
}

export interface SettingsNavProps<TValue extends string> {
  groups: SettingsNavGroup<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
}

/**
 * The sections of the settings page. A column on a wide screen, one
 * scrolling row on a phone. Every entry is a real link, so it opens in a
 * new tab and the address bar carries the section.
 */
export function SettingsNav<TValue extends string>(props: SettingsNavProps<TValue>) {
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
      aria-label="Settings sections"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:gap-6 lg:self-start lg:overflow-visible lg:px-0"
    >
      {A.map(props.groups, (group) => (
        <div key={group.label} className="flex shrink-0 gap-1 lg:flex-col">
          <p className="text-muted-foreground hidden px-3 pb-1 text-xs font-medium tracking-wide uppercase lg:block">
            {group.label}
          </p>
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
