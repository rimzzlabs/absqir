import { cn } from "@absqir/ui/lib/utils";
import { WarningIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export interface DangerZoneProps {
  /** The rows. Each one is a DangerZoneRow. */
  children: ReactNode;
  className?: string;
}

/**
 * The last block of a settings tab: the actions nothing can undo. The frame
 * is red so a reader who scrolls past knows to slow down.
 */
export function DangerZone(props: DangerZoneProps) {
  return (
    <section
      aria-label="Danger zone"
      className={cn("border-destructive/30 min-w-0 rounded-xl border", props.className)}
    >
      <header className="border-destructive/20 flex items-center gap-2 border-b px-5 py-4">
        <WarningIcon weight="fill" className="text-destructive size-5 shrink-0" />
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold tracking-tight">Danger zone</h3>
          <p className="text-muted-foreground text-sm">Nothing here can be undone.</p>
        </div>
      </header>
      <div className="divide-destructive/20 divide-y">{props.children}</div>
    </section>
  );
}

export interface DangerZoneRowProps {
  title: string;
  description: ReactNode;
  /** The button that starts the action, or a sentence that says why there is none. */
  action: ReactNode;
}

export function DangerZoneRow(props: DangerZoneRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm font-medium">{props.title}</p>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm">{props.description}</p>
      </div>
      <div className="shrink-0">{props.action}</div>
    </div>
  );
}
