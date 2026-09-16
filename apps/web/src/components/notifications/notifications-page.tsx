import { displayTimezone, relativeToNow } from "@absqir/core/date";
import { notificationBody, notificationTitle } from "@absqir/core/notification-text";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { cn } from "@absqir/ui/lib/utils";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { A } from "@mobily/ts-belt";
import { BellIcon } from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { match, P } from "ts-pattern";
import { NOTIFICATION_ICONS } from "@/components/notifications/notification-icon";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { useOrgHref } from "@/lib/org-path";
import { useMarkRead } from "@/mutations/use-mark-read";
import {
  type Notification,
  type NotificationScope,
  useNotifications,
} from "@/queries/use-notifications";

function Row(props: { notification: Notification; onRead: (id: string) => void }) {
  const { notification } = props;
  const t = useTranslate();
  const orgHref = useOrgHref();
  // The words are made here, from the key the row kept, so a reader who
  // changed their language reads the whole list in it.
  const title = notificationTitle(t, notification);
  const body = notificationBody(t, notification, { timezone: displayTimezone() });
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
          {match(notification.href)
            .with(P.string.minLength(1), (href) => (
              // The row holds the address inside the organization, so the
              // slug goes in front here rather than in the stored row.
              <a href={orgHref(href)} className="hover:underline">
                {title}
              </a>
            ))
            .otherwise(() => title)}
          {match(unread)
            .with(true, () => (
              <>
                <span aria-hidden className="bg-primary size-1.5 rounded-full" />
                <span className="sr-only">{t("notifications:unread")}</span>
              </>
            ))
            .otherwise(() => null)}
        </p>
        {match(body)
          .with(P.string.minLength(1), (body) => (
            <p className="text-muted-foreground mt-0.5 text-sm">{body}</p>
          ))
          .otherwise(() => null)}
        <p className="text-muted-foreground mt-1 text-xs">
          {relativeToNow(new Date(notification.createdAt))}
        </p>
      </div>

      {match(unread)
        .with(true, () => (
          <Button variant="ghost" size="sm" onClick={() => props.onRead(notification.id)}>
            {t("notifications:markRead")}
          </Button>
        ))
        .otherwise(() => null)}
    </li>
  );
}

function NothingHere(props: { scope: NotificationScope }) {
  const t = useTranslate();

  return (
    <Empty className="border-border rounded-xl border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BellIcon />
        </EmptyMedia>
        <EmptyTitle>
          {match(props.scope)
            .with("unread", () => t("notifications:emptyUnreadTitle"))
            .otherwise(() => t("notifications:emptyTitle"))}
        </EmptyTitle>
        <EmptyDescription>
          {match(props.scope)
            .with("unread", () => t("notifications:emptyUnreadDescription"))
            .otherwise(() => t("notifications:emptyDescription"))}
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
  const t = useTranslate();
  const [scope, setScope] = useQueryState("scope", SCOPE);
  const notifications = useNotifications(scope);
  const markRead = useMarkRead();

  const unread = A.filter(notifications.data ?? [], (row) => row.readAt === null).length;

  return (
    <>
      <PageHeader
        title={t("notifications:title")}
        description={t("notifications:description")}
        actions={match(unread > 0)
          .with(true, () => (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markRead.mutate(null)}
              disabled={markRead.isPending}
            >
              {t("notifications:markAllRead")}
            </Button>
          ))
          .otherwise(() => null)}
      />

      <Tabs value={scope} onValueChange={(value) => void setScope(value as NotificationScope)}>
        <TabsList>
          <TabsTrigger value="all">{t("notifications:all")}</TabsTrigger>
          <TabsTrigger value="unread">{t("notifications:unreadTab")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {match(markRead.isError)
        .with(true, () => <FormError error={markRead.error} />)
        .otherwise(() => null)}

      {match(notifications)
        .with({ isPending: true }, () => <Skeleton className="h-64 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          match(rows.length)
            .with(0, () => <NothingHere scope={scope} />)
            .otherwise(() => (
              <ul className="border-border overflow-hidden rounded-xl border">
                {A.map(rows, (row) => (
                  <Row key={row.id} notification={row} onRead={(id) => markRead.mutate([id])} />
                ))}
              </ul>
            )),
        )
        .otherwise(() => null)}
    </>
  );
}

export interface NotificationsPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
}

export function NotificationsPage(props: NotificationsPageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <NotificationsBody />
    </Providers>
  );
}
