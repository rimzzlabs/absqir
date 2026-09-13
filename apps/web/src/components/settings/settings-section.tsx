import { cn } from "@absqir/ui/lib/utils";
import type { ReactNode } from "react";
import { match } from "ts-pattern";

export interface SettingsSectionProps {
  title: string;
  description?: ReactNode;
  /** Buttons that act on the whole section. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** One topic on a settings page: a heading with a rule under it, then rows. */
export function SettingsSection(props: SettingsSectionProps) {
  return (
    <section aria-label={props.title} className={cn("min-w-0", props.className)}>
      <header className="border-border flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-4">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold tracking-tight">{props.title}</h2>
          {match(Boolean(props.description))
            .with(true, () => (
              <p className="text-muted-foreground mt-1 max-w-prose text-sm">{props.description}</p>
            ))
            .otherwise(() => null)}
        </div>
        {match(Boolean(props.actions))
          .with(true, () => <div className="flex items-center gap-2">{props.actions}</div>)
          .otherwise(() => null)}
      </header>
      {props.children}
    </section>
  );
}

export interface SettingsRowProps {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The label and its hint on the left, the control on the right. The rows
 * of one section share a grid, so every control starts on the same line.
 */
export function SettingsRow(props: SettingsRowProps) {
  return (
    <div
      className={cn(
        "border-border grid gap-3 border-b py-6 last:border-b-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-x-10 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]",
        props.className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{props.label}</p>
        {match(Boolean(props.hint))
          .with(true, () => <p className="text-muted-foreground mt-1 text-sm">{props.hint}</p>)
          .otherwise(() => null)}
      </div>
      <div className="min-w-0">{props.children}</div>
    </div>
  );
}
