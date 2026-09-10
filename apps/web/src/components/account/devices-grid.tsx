import { formatDate, relativeToNow } from "@absqir/core/date";
import { type DeviceKind, describeUserAgent } from "@absqir/core/user-agent";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { ScrollArea } from "@absqir/ui/scroll-area";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
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
import { type Device, useDevices } from "@/queries/use-devices";

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
  device: Device;
  pending: boolean;
  onRevoke: (token: string) => void;
}) {
  const { device } = props;
  const agent = describeUserAgent(device.userAgent);
  const KindIcon = KIND_ICONS[agent.kind];
  const PlatformIcon = PLATFORM_ICONS[agent.platform];

  return (
    <li
      className={cn(
        "bg-card text-card-foreground relative flex flex-col gap-4 rounded-xl p-4 ring-1",
        device.current ? "ring-primary/50" : "ring-foreground/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-lg",
            device.current ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <KindIcon className="size-6" weight="duotone" />
        </span>
        {device.current ? <Badge>This device</Badge> : null}
      </div>

      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {PlatformIcon ? (
            <PlatformIcon className="text-muted-foreground size-4 shrink-0" weight="fill" />
          ) : null}
          <span className="truncate">
            {agent.browser} on {agent.platform}
          </span>
        </p>
        <p className="text-muted-foreground text-sm">
          {device.current ? "Active now" : `Last seen ${relativeToNow(new Date(device.updatedAt))}`}
        </p>
      </div>

      <dl className="text-muted-foreground grid gap-1 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt>Signed in</dt>
          <dd className="text-foreground">{formatDate(new Date(device.createdAt))}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Address</dt>
          <dd className="text-foreground truncate font-mono">{device.ipAddress ?? "Unknown"}</dd>
        </div>
      </dl>

      {device.current ? null : (
        <Button
          variant="outline"
          size="sm"
          className="mt-auto w-full"
          disabled={props.pending}
          onClick={() => props.onRevoke(device.token)}
        >
          Sign out
        </Button>
      )}
    </li>
  );
}

const GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

/**
 * Every browser signed in as me, one card each. The grid scrolls in its own
 * box, and the next page arrives when asked, so a long list never stretches
 * the settings page.
 */
export function DevicesGrid() {
  const devices = useDevices();
  const revoke = useRevokeSession();
  const rows = A.flatMap(devices.data?.pages ?? [], (page) => page.items);

  return (
    <div className="space-y-4">
      {match(devices)
        .with({ isPending: true }, () => (
          <div className={GRID} aria-busy>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.nonNullable }, () => (
          <ScrollArea className="rounded-xl" viewportClassName="max-h-[32rem] pr-3">
            <ul className={cn(GRID, "p-px")}>
              {A.map(rows, (device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  pending={revoke.isPending}
                  onRevoke={(token) => revoke.mutate(token)}
                />
              ))}
            </ul>

            {devices.hasNextPage ? (
              <div className="flex justify-center pt-4 pb-px">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={devices.isFetchingNextPage}
                  onClick={() => void devices.fetchNextPage()}
                >
                  {devices.isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </ScrollArea>
        ))
        .otherwise(() => null)}

      <FormError error={revoke.error} />
    </div>
  );
}

/** Whether a device other than this one is signed in. False hides the sign-out-all button. */
export function useHasOtherDevices(): boolean {
  const devices = useDevices();
  const rows = A.flatMap(devices.data?.pages ?? [], (page) => page.items);

  return devices.hasNextPage || A.some(rows, (row) => !row.current);
}
