import { Button } from "@absqir/ui/button";
import { BellIcon } from "@phosphor-icons/react";
import { useUnreadCount } from "@/queries/use-notifications";

const MAX_SHOWN = 9;

/** The badge in the header. It says how many wait, and links to the list. */
export function NotificationBell() {
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      // A link, not a button: Base UI needs telling so it keeps anchor semantics.
      nativeButton={false}
      render={<a href="/notifications" />}
      aria-label={count === 0 ? "Notifications" : `Notifications, ${count} unread`}
      className="relative"
    >
      <BellIcon />
      {count > 0 ? (
        <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums">
          {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
        </span>
      ) : null}
    </Button>
  );
}
