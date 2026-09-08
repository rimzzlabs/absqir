import { relativeToNow } from "@absqir/core/date";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { cn } from "@absqir/ui/lib/utils";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { BellIcon } from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { match, P } from "ts-pattern";
import { NOTIFICATION_ICONS } from "@/components/notifications/notification-icon";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { useMarkRead } from "@/mutations/use-mark-read";
import {
  type Notification,
  type NotificationScope,
  useNotifications,
} from "@/queries/use-notifications";

function Row(props: { notification: Notification; onRead: (id: string) => void }) {
  const { notification } = props;
  const Icon = NOTIFICATION_ICONS[notification.type];
  const unread = notification.readAt === null;

  return (
    <li
      className={cn(
        "border-border flex items-start gap-3 border-b p-4 last:border-b-0",
        unread && "bg-muted/40",
      )}
    >
      <span className="bg-muted text-muted-foreground mt-0.5 rounded-full p-2">
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">
          {notification.href ? (
            <a href={notification.href} className="hover:underline">
              {notification.title}
            </a>
          ) : (
            notification.title
          )}
          {unread ? (
            <>
              <span aria-hidden className="bg-primary size-1.5 rounded-full" />
              <span className="sr-only">Unread</span>
            </>
          ) : null}
        </p>
        {notification.body ? (
          <p className="text-muted-foreground mt-0.5 text-sm">{notification.body}</p>
        ) : null}
        <p className="text-muted-foreground mt-1 text-xs">
          {relativeToNow(new Date(notification.createdAt))}
        </p>
      </div>

      {unread ? (
        <Button variant="ghost" size="sm" onClick={() => props.onRead(notification.id)}>
          Mark read
        </Button>
      ) : null}
    </li>
  );
}

function NothingHere(props: { scope: NotificationScope }) {
  return (
    <Empty className="border-border rounded-xl border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BellIcon />
        </EmptyMedia>
        <EmptyTitle>{props.scope === "unread" ? "Nothing waiting" : "Nothing yet"}</EmptyTitle>
        <EmptyDescription>
          {props.scope === "unread"
            ? "You have read everything."
            : "Reminders before a session, leave requests, and closings land here."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

const SCOPE = parseAsStringLiteral([
  "all",
  "unread",
] as const satisfies NotificationScope[]).withDefault("all");

function NotificationsBody() {
  const [scope, setScope] = useQueryState("scope", SCOPE);
  const notifications = useNotifications(scope);
  const markRead = useMarkRead();

  const unread = (notifications.data ?? []).filter((row) => row.readAt === null).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Everything that happened that concerns you. Email as well, when the instance sends it."
        actions={
          unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markRead.mutate(null)}
              disabled={markRead.isPending}
            >
              Mark all read
            </Button>
          ) : null
        }
      />

      <Tabs value={scope} onValueChange={(value) => void setScope(value as NotificationScope)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>
      </Tabs>

      {markRead.isError ? <FormError error={markRead.error} /> : null}

      {match(notifications)
        .with({ isPending: true }, () => <Skeleton className="h-64 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          rows.length === 0 ? (
            <NothingHere scope={scope} />
          ) : (
            <ul className="border-border overflow-hidden rounded-xl border">
              {rows.map((row) => (
                <Row key={row.id} notification={row} onRead={(id) => markRead.mutate([id])} />
              ))}
            </ul>
          ),
        )
        .otherwise(() => null)}
    </>
  );
}

export function NotificationsPage() {
  return (
    <Providers>
      <NotificationsBody />
    </Providers>
  );
}
