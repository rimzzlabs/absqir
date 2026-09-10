import { cn } from "@absqir/ui/lib/utils";
import { match } from "ts-pattern";
import { useHealth } from "@/queries/use-health";

type HealthState = "up" | "down" | "checking";

const LABEL: Record<HealthState, string> = {
  up: "Everything runs",
  down: "The API does not answer",
  checking: "Checking the API…",
};

const DOT: Record<HealthState, string> = {
  up: "bg-emerald-500",
  down: "bg-destructive",
  checking: "bg-sidebar-foreground/30 animate-pulse",
};

/** One dot in the sidebar footer: whether the API answers. */
export function SidebarStatus() {
  const health = useHealth();
  const state = match(health)
    .returnType<HealthState>()
    .with({ isSuccess: true }, () => "up")
    .with({ isError: true }, () => "down")
    .otherwise(() => "checking");

  return (
    <div
      role="status"
      className="text-sidebar-foreground/70 flex h-8 items-center gap-2 px-2 text-xs group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[state])} />
      <span className="truncate group-data-[collapsible=icon]:hidden">{LABEL[state]}</span>
    </div>
  );
}
