import { Button } from "@absqir/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@absqir/ui/popover";
import { BellIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { NotificationPreview } from "@/components/app-shell/notification-preview";
import { useCanHover } from "@/lib/use-can-hover";
import { useNotificationStream } from "@/queries/use-notification-stream";
import { useUnreadCount } from "@/queries/use-notifications";

const MAX_SHOWN = 9;
const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 200;

/**
 * The bell in the header. A click opens the popover everywhere; with a mouse
 * a pointer that rests on it opens it as well. The stream that keeps the
 * badge live lives here too, because the bell is on every page.
 */
export function NotificationBell() {
  useNotificationStream();
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;
  const canHover = useCanHover();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        openOnHover={canHover}
        delay={OPEN_DELAY_MS}
        closeDelay={CLOSE_DELAY_MS}
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={count === 0 ? "Notifications" : `Notifications, ${count} unread`}
          />
        }
      >
        <BellIcon />
        {count > 0 ? (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums">
            {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 gap-0 p-0">
        <NotificationPreview open={open} unread={count} />
      </PopoverContent>
    </Popover>
  );
}
