import { formatDate, relativeToNow } from "@absqir/core/date";
import { type DeviceKind, describeUserAgent } from "@absqir/core/user-agent";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { Skeleton } from "@absqir/ui/skeleton";
import {
  AndroidLogoIcon,
  AppleLogoIcon,
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  GoogleChromeLogoIcon,
  type Icon,
  LinuxLogoIcon,
  WindowsLogoIcon,
} from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { useRevokeSession } from "@/mutations/use-revoke-session";
import { type AccountSession, useAccountSessions } from "@/queries/use-account-sessions";

const KIND_ICONS: Record<DeviceKind, Icon> = {
  phone: DeviceMobileIcon,
  tablet: DeviceTabletIcon,
  desktop: DesktopIcon,
};

const PLATFORM_ICONS: Record<string, Icon> = {
  iPhone: AppleLogoIcon,
  iPad: AppleLogoIcon,
  macOS: AppleLogoIcon,
  Android: AndroidLogoIcon,
  Windows: WindowsLogoIcon,
  Linux: LinuxLogoIcon,
  ChromeOS: GoogleChromeLogoIcon,
};

function DeviceCard(props: {
  session: AccountSession;
  pending: boolean;
  onRevoke: (token: string) => void;
}) {
  const { session } = props;
  const device = describeUserAgent(session.userAgent);
  const KindIcon = KIND_ICONS[device.kind];
  const PlatformIcon = PLATFORM_ICONS[device.platform];

  return (
    <li
      className={cn(
        "bg-card text-card-foreground relative flex flex-col gap-4 rounded-xl p-4 ring-1",
        session.current ? "ring-primary/50" : "ring-foreground/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-lg",
            session.current ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <KindIcon className="size-6" weight="duotone" />
        </span>
        {session.current ? <Badge>This device</Badge> : null}
      </div>

      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {PlatformIcon ? (
            <PlatformIcon className="text-muted-foreground size-4 shrink-0" weight="fill" />
          ) : null}
          <span className="truncate">
            {device.browser} on {device.platform}
          </span>
        </p>
        <p className="text-muted-foreground text-sm">
          {session.current
            ? "Active now"
            : `Last seen ${relativeToNow(new Date(session.updatedAt))}`}
        </p>
      </div>

      <dl className="text-muted-foreground grid gap-1 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt>Signed in</dt>
          <dd className="text-foreground">{formatDate(new Date(session.createdAt))}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Address</dt>
          <dd className="text-foreground truncate font-mono">{session.ipAddress ?? "Unknown"}</dd>
        </div>
      </dl>

      {session.current ? null : (
        <Button
          variant="outline"
          size="sm"
          className="mt-auto w-full"
          disabled={props.pending}
          onClick={() => props.onRevoke(session.token)}
        >
          Sign out
        </Button>
      )}
    </li>
  );
}

const GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

/** Every browser signed in as me, one card each. */
export function DevicesGrid() {
  const sessions = useAccountSessions();
  const revoke = useRevokeSession();

  return (
    <div className="space-y-4">
      {match(sessions)
        .with({ isPending: true }, () => (
          <div className={GRID} aria-busy>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) => (
          <ul className={GRID}>
            {rows.map((row) => (
              <DeviceCard
                key={row.id}
                session={row}
                pending={revoke.isPending}
                onRevoke={(token) => revoke.mutate(token)}
              />
            ))}
          </ul>
        ))
        .otherwise(() => null)}

      <FormError error={revoke.error} />
    </div>
  );
}

/** How many devices other than this one. Zero hides the sign-out-all button. */
export function useOtherDeviceCount(): number {
  const sessions = useAccountSessions();
  return (sessions.data ?? []).filter((row) => !row.current).length;
}
