import { cn } from "@absqir/ui/lib/utils";
import { useHealth } from "@/queries/use-health";

/** One dot in the sidebar footer: whether the API answers. */
export function SidebarStatus() {
  const health = useHealth();
  const label = health.isSuccess
    ? "Everything runs"
    : health.isError
      ? "The API does not answer"
      : "Checking the API…";

  return (
    <div
      role="status"
      className="text-sidebar-foreground/70 flex h-8 items-center gap-2 px-2 text-xs group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          health.isSuccess
            ? "bg-emerald-500"
            : health.isError
              ? "bg-destructive"
              : "bg-sidebar-foreground/30 animate-pulse",
        )}
      />
      <span className="truncate group-data-[collapsible=icon]:hidden">{label}</span>
    </div>
  );
}
