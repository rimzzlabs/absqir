import { relativeToNow } from "@absqir/core/date";
import { deviceLabel } from "@absqir/core/user-agent";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Skeleton } from "@absqir/ui/skeleton";
import { DesktopIcon, DeviceMobileIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { useRevokeSession } from "@/mutations/use-revoke-session";
import { type AccountSession, useAccountSessions } from "@/queries/use-account-sessions";

function isHandheld(userAgent: string | null): boolean {
  return /iPhone|iPad|Android/.test(userAgent ?? "");
}

function SessionRow(props: {
  session: AccountSession;
  pending: boolean;
  onRevoke: (token: string) => void;
}) {
  const { session } = props;
  const Icon = isHandheld(session.userAgent) ? DeviceMobileIcon : DesktopIcon;

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="bg-muted text-muted-foreground rounded-full p-2">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{deviceLabel(session.userAgent)}</span>
          {session.current ? <Badge variant="secondary">This device</Badge> : null}
        </p>
        <p className="text-muted-foreground text-xs">
          Last seen {relativeToNow(new Date(session.updatedAt))}
          {session.ipAddress ? ` from ${session.ipAddress}` : ""}
        </p>
      </div>
      {session.current ? null : (
        <Button
          variant="outline"
          size="sm"
          disabled={props.pending}
          onClick={() => props.onRevoke(session.token)}
        >
          Sign out
        </Button>
      )}
    </li>
  );
}

export function SessionsCard() {
  const sessions = useAccountSessions();
  const revoke = useRevokeSession();
  const others = (sessions.data ?? []).filter((row) => !row.current).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices</CardTitle>
        <CardDescription>
          Every browser signed in as you. Sign out the ones you do not know.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {match(sessions)
          .with({ isPending: true }, () => <Skeleton className="h-24 rounded-lg" />)
          .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
          .with({ data: P.select(P.nonNullable) }, (rows) => (
            <ul className="divide-border divide-y">
              {rows.map((row) => (
                <SessionRow
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

        {others > 0 ? (
          <Button variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate(null)}>
            Sign out everywhere else
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
