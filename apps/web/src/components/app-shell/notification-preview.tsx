import { relativeToNow } from "@absqir/core/date";
import { Button, buttonVariants } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { match, P } from "ts-pattern";
import { NOTIFICATION_ICONS } from "@/components/notifications/notification-icon";
import { FormError } from "@/components/shared/form-error";
import { useMarkRead } from "@/mutations/use-mark-read";
import { type Notification, useNotifications } from "@/queries/use-notifications";

const SHOWN = 5;

export interface NotificationPreviewProps {
  /** The card is mounted before it opens; the list loads only once it does. */
  open: boolean;
  unread: number;
}

/** Unread first, newest first inside each half. A stable sort keeps the order. */
function pick(rows: Notification[]): Notification[] {
  return A.sort([...rows], (a, b) => Number(a.readAt !== null) - Number(b.readAt !== null)).slice(
    0,
    SHOWN,
  );
}

function PreviewRow(props: { notification: Notification; onRead: (id: string) => Promise<void> }) {
  const { notification } = props;
  const Icon = NOTIFICATION_ICONS[notification.type];
  const unread = notification.readAt === null;

  const body = (
    <>
      <span className="bg-muted text-muted-foreground mt-0.5 shrink-0 rounded-full p-1.5">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cn("truncate text-sm", unread ? "font-medium" : "text-foreground/80")}>
            {notification.title}
          </span>
          {unread ? (
            <>
              <span aria-hidden className="bg-primary size-1.5 shrink-0 rounded-full" />
              <span className="sr-only">Unread</span>
            </>
          ) : null}
        </span>
        {notification.body ? (
          <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">
            {notification.body}
          </span>
        ) : null}
        <span className="text-muted-foreground mt-0.5 block text-[11px]">
          {relativeToNow(new Date(notification.createdAt))}
        </span>
      </span>
    </>
  );

  const className = cn(
    "hover:bg-muted focus-visible:bg-muted flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left outline-none",
    unread && "bg-muted/40",
  );

  if (notification.href) {
    const href = notification.href;

    return (
      <li>
        <a
          href={href}
          className={className}
          onClick={(event) => {
            if (!unread) return;
            // Mark first, then go: a navigation cancels a fetch still in flight.
            event.preventDefault();
            void props.onRead(notification.id).finally(() => window.location.assign(href));
          }}
        >
          {body}
        </a>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className={className}
        disabled={!unread}
        onClick={() => void props.onRead(notification.id)}
      >
        {body}
      </button>
    </li>
  );
}

export function NotificationPreview(props: NotificationPreviewProps) {
  const notifications = useNotifications("all", { enabled: props.open });
  const markRead = useMarkRead();

  const onRead = async (id: string) => {
    await markRead.mutateAsync([id]).catch(() => undefined);
  };

  return (
    <div className="flex flex-col">
      <div className="flex h-9 items-center justify-between px-3">
        <p className="text-sm font-medium">Notifications</p>
        {props.unread > 0 ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => markRead.mutate(null)}
            disabled={markRead.isPending}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="border-border border-t px-1 py-1">
        {match(notifications)
          .with({ isPending: true }, () => (
            <div className="space-y-2 p-2">
              <Skeleton className="h-10 rounded-md" />
              <Skeleton className="h-10 rounded-md" />
              <Skeleton className="h-10 rounded-md" />
            </div>
          ))
          .with({ isError: true, error: P.select() }, (error) => (
            <div className="p-2">
              <FormError error={error} />
            </div>
          ))
          .with({ data: P.select(P.nonNullable) }, (rows) =>
            rows.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                Nothing yet. Reminders and requests land here.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {A.map(pick(rows), (row) => (
                  <PreviewRow key={row.id} notification={row} onRead={onRead} />
                ))}
              </ul>
            ),
          )
          .otherwise(() => null)}
      </div>

      <div className="border-border border-t p-1">
        <a
          href="/notifications"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full" })}
        >
          All notifications
        </a>
      </div>
    </div>
  );
}
