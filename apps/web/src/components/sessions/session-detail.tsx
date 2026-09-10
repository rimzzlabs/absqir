import { formatDate, formatRange } from "@absqir/core/date";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@absqir/ui/alert-dialog";
import { Badge } from "@absqir/ui/badge";
import { Button, buttonVariants } from "@absqir/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import {
  CameraIcon,
  DownloadSimpleIcon,
  LockIcon,
  LockOpenIcon,
  PencilSimpleIcon,
  QrCodeIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { PublicLink } from "@/components/sessions/public-link";
import { SessionDialog } from "@/components/sessions/session-dialog";
import { SessionRecords } from "@/components/sessions/session-records";
import { FormError } from "@/components/shared/form-error";
import type { RoleName } from "@/components/shared/role-badge";
import { SessionStatusBadge } from "@/components/shared/status-badge";
import { useCloseSession } from "@/mutations/use-close-session";
import { useOpenSession } from "@/mutations/use-open-session";
import { useRemoveSession } from "@/mutations/use-remove-session";
import { type Session, useSession } from "@/queries/use-sessions";

export interface SessionDetailProps {
  sessionId: string;
  role: RoleName;
}

function Stat(props: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{props.value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function Header(props: { session: Session; role: RoleName }) {
  const { session } = props;
  const open = useOpenSession();
  const close = useCloseSession();
  const remove = useRemoveSession();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const isAdmin = props.role === "owner" || props.role === "admin";

  return (
    <header className="space-y-4">
      <a href="/sessions" className="text-muted-foreground hover:text-foreground text-sm">
        ← Events
      </a>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{session.title}</h1>
            <SessionStatusBadge status={session.status} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatRange(new Date(session.startsAt), new Date(session.endsAt))} · late after{" "}
            {session.lateAfterMinutes} min · opens {session.opensBeforeMinutes} min early
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {A.map(session.groups, (group) => (
              <Badge key={group.id} variant="outline">
                {group.name}
              </Badge>
            ))}
            {session.allowWalkIns ? <Badge variant="secondary">Walk-ins allowed</Badge> : null}
          </div>
          {session.description ? (
            <p className="text-muted-foreground mt-2 max-w-prose text-sm">{session.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session.status !== "done" ? (
            <>
              <a
                href={`/sessions/${session.id}/display`}
                className={buttonVariants({ size: "sm" })}
              >
                <QrCodeIcon />
                Room screen
              </a>
              <a
                href={`/sessions/${session.id}/scan`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                <CameraIcon />
                Scanner
              </a>
            </>
          ) : null}
          {session.status === "scheduled" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={open.isPending}
              onClick={() => open.mutate(session.id)}
            >
              <LockOpenIcon />
              Open now
            </Button>
          ) : null}
          {session.status === "running" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={close.isPending}
              onClick={() => close.mutate(session.id)}
            >
              <LockIcon />
              Close now
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <PencilSimpleIcon />
            Edit
          </Button>
          <a
            href={`/api/sessions/${session.id}/records.csv`}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <DownloadSimpleIcon />
            CSV
          </a>
          {isAdmin ? (
            <Button size="sm" variant="outline" onClick={() => setRemoving(true)}>
              <TrashIcon />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <FormError error={open.error ?? close.error ?? remove.error} />

      {session.registrationOpen ? <PublicLink session={session} /> : null}

      {session.closedAt ? (
        <p className="text-muted-foreground text-xs">
          Closed {formatDate(new Date(session.closedAt), "dateTime")}. Everyone expected without a
          check-in was marked absent.
        </p>
      ) : null}

      <SessionDialog open={editing} onOpenChange={setEditing} session={session} />

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {session.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every record of this event goes with it. There is no undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(session.id, { onSuccess: () => window.location.assign("/sessions") })
              }
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

function SessionDetailBody(props: SessionDetailProps) {
  const session = useSession(props.sessionId);

  return match(session)
    .with({ isPending: true }, () => (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    ))
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <>
        <Header session={data} role={props.role} />

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Expected" value={data.counts.expected} />
          <Stat label="Present" value={data.counts.present} />
          <Stat label="Late" value={data.counts.late} />
          <Stat label="Excused" value={data.counts.excused} />
          <Stat label="Absent" value={data.counts.absent} />
        </div>

        <SessionRecords session={data} />
      </>
    ))
    .otherwise(() => null);
}

export function SessionDetail(props: SessionDetailProps) {
  return (
    <Providers>
      <SessionDetailBody {...props} />
    </Providers>
  );
}
