import { formatDate, formatRange } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@absqir/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { QrCodeIcon, TicketIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { AttendanceStatusBadge, SessionStatusBadge } from "@/components/shared/status-badge";
import { type MySession, useMyPass, useMySessions } from "@/queries/use-my";

function PassDialog(props: { sessionId: string | null; onClose: () => void }) {
  const pass = useMyPass(props.sessionId);

  return (
    <Dialog open={props.sessionId !== null} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle>{pass.data?.sessionTitle ?? "Your pass"}</DialogTitle>
          <DialogDescription>
            Show this to the organizer at the door. It is yours alone.
          </DialogDescription>
        </DialogHeader>
        {match(pass)
          .with({ isPending: true }, () => <Skeleton className="mx-auto size-64 rounded-xl" />)
          .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
          .with({ data: P.select(P.nonNullable) }, (data) => (
            <>
              <img
                src={data.qrDataUrl}
                alt="Your pass as a QR code"
                className="border-border mx-auto w-64 rounded-xl border bg-white p-3"
              />
              <p className="text-sm font-medium">{data.personName}</p>
              <p className="text-muted-foreground font-mono text-[10px] break-all">{data.code}</p>
            </>
          ))
          .otherwise(() => null)}
      </DialogContent>
    </Dialog>
  );
}

function SessionRow(props: { session: MySession; onPass: (id: string) => void }) {
  const { session } = props;
  const opensAt = new Date(
    new Date(session.startsAt).getTime() - session.opensBeforeMinutes * 60_000,
  );

  return (
    <li className="border-border flex flex-wrap items-center gap-4 rounded-xl border p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{session.title}</p>
          <SessionStatusBadge status={session.status} />
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatRange(new Date(session.startsAt), new Date(session.endsAt))}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {session.groups.map((group) => (
            <Badge key={group.id} variant="outline">
              {group.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {session.record ? (
          <div className="text-right">
            <AttendanceStatusBadge status={session.record.status} />
            {session.record.checkedInAt ? (
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                {formatDate(new Date(session.record.checkedInAt), "time")}
              </p>
            ) : null}
          </div>
        ) : session.status === "running" ? (
          <Button size="sm" onClick={() => props.onPass(session.id)}>
            <TicketIcon />
            My pass
          </Button>
        ) : session.status === "scheduled" ? (
          <p className="text-muted-foreground text-xs">
            Opens {formatDate(opensAt, "weekdayDateTime")}
          </p>
        ) : (
          <AttendanceStatusBadge status={null} />
        )}
      </div>
    </li>
  );
}

function MySessionsBody() {
  const sessions = useMySessions();
  const [passFor, setPassFor] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="My sessions"
        description="Where you are expected. When one runs, scan the screen in the room, or show your pass at the door."
      />

      {match(sessions)
        .with({ isPending: true }, () => <Skeleton className="h-40 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          rows.length === 0 ? (
            <Empty className="border-border rounded-xl border border-dashed py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <QrCodeIcon />
                </EmptyMedia>
                <EmptyTitle>Nothing expects you yet</EmptyTitle>
                <EmptyDescription>
                  Sessions appear here once an organizer schedules one for a group you belong to.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="space-y-3">
              {rows.map((session) => (
                <SessionRow key={session.id} session={session} onPass={setPassFor} />
              ))}
            </ul>
          ),
        )
        .otherwise(() => null)}

      <PassDialog sessionId={passFor} onClose={() => setPassFor(null)} />
    </>
  );
}

export function MySessionsPage() {
  return (
    <Providers>
      <MySessionsBody />
    </Providers>
  );
}
