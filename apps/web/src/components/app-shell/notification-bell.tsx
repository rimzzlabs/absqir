import { buttonVariants } from "@absqir/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@absqir/ui/hover-card";
import { cn } from "@absqir/ui/lib/utils";
import { BellIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { NotificationPreview } from "@/components/app-shell/notification-preview";
import { useNotificationStream } from "@/queries/use-notification-stream";
import { useUnreadCount } from "@/queries/use-notifications";

const MAX_SHOWN = 9;
const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 200;

/**
 * The bell in the header. It is a link to the full list, so a tap on a phone
 * lands there; a pointer that rests on it, or keyboard focus, opens a card
 * with the newest few. The stream that keeps the badge live lives here too,
 * because the bell is the one thing mounted on every page.
 */
export function NotificationBell() {
  useNotificationStream();
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;
  const [open, setOpen] = useState(false);

  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCardTrigger
        href="/notifications"
        delay={OPEN_DELAY_MS}
        closeDelay={CLOSE_DELAY_MS}
        aria-label={count === 0 ? "Notifications" : `Notifications, ${count} unread`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
      >
        <BellIcon />
        {count > 0 ? (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums">
            {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
          </span>
        ) : null}
      </HoverCardTrigger>

      <HoverCardContent align="end" sideOffset={8} className="w-80 p-0">
        <NotificationPreview open={open} unread={count} />
      </HoverCardContent>
    </HoverCard>
  );
}
