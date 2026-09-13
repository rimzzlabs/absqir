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
import { EventDialog } from "@/components/events/event-dialog";
import { EventRecords } from "@/components/events/event-records";
import { PublicLink } from "@/components/events/public-link";
import { Providers } from "@/components/providers";
import { BackLink } from "@/components/shared/back-link";
import { FormError } from "@/components/shared/form-error";
import type { RoleName } from "@/components/shared/role-badge";
import { EventStatusBadge } from "@/components/shared/status-badge";
import { useCloseEvent } from "@/mutations/use-close-event";
import { useOpenEvent } from "@/mutations/use-open-event";
import { useRemoveEvent } from "@/mutations/use-remove-event";
import { type Event, useEvent } from "@/queries/use-events";

export interface EventDetailProps {
  eventId: string;
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

function Header(props: { event: Event; role: RoleName }) {
  const { event } = props;
  const open = useOpenEvent();
  const close = useCloseEvent();
  const remove = useRemoveEvent();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const isAdmin = props.role === "owner" || props.role === "admin";

  return (
    <header className="space-y-4">
      <BackLink href="/events">Events</BackLink>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{event.title}</h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatRange(new Date(event.startsAt), new Date(event.endsAt))} · late after{" "}
            {event.lateAfterMinutes} min · opens {event.opensBeforeMinutes} min early
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {A.map(event.groups, (group) => (
              <Badge key={group.id} variant="outline">
                {group.name}
              </Badge>
            ))}
            {match(event.allowWalkIns)
              .with(true, () => <Badge variant="secondary">Walk-ins allowed</Badge>)
              .otherwise(() => null)}
          </div>
          {match(event.description)
            .with(P.string.minLength(1), (description) => (
              <p className="text-muted-foreground mt-2 max-w-prose text-sm">{description}</p>
            ))
            .otherwise(() => null)}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {match(event.status)
            .with("done", () => null)
            .otherwise(() => (
              <>
                <a href={`/events/${event.id}/display`} className={buttonVariants({ size: "sm" })}>
                  <QrCodeIcon />
                  Room screen
                </a>
                <a
                  href={`/events/${event.id}/scan`}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  <CameraIcon />
                  Scanner
                </a>
              </>
            ))}
          {match(event.status)
            .with("scheduled", () => (
              <Button
                size="sm"
                variant="outline"
                disabled={open.isPending}
                onClick={() => open.mutate(event.id)}
              >
                <LockOpenIcon />
                Open now
              </Button>
            ))
            .otherwise(() => null)}
          {match(event.status)
            .with("running", () => (
              <Button
                size="sm"
                variant="outline"
                disabled={close.isPending}
                onClick={() => close.mutate(event.id)}
              >
                <LockIcon />
                Close now
              </Button>
            ))
            .otherwise(() => null)}
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <PencilSimpleIcon />
            Edit
          </Button>
          <a
            href={`/api/events/${event.id}/records.csv`}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <DownloadSimpleIcon />
            CSV
          </a>
          {match(isAdmin)
            .with(true, () => (
              <Button size="sm" variant="outline" onClick={() => setRemoving(true)}>
                <TrashIcon />
                Delete
              </Button>
            ))
            .otherwise(() => null)}
        </div>
      </div>

      <FormError error={open.error ?? close.error ?? remove.error} />

      {match(event.registrationOpen)
        .with(true, () => <PublicLink event={event} />)
        .otherwise(() => null)}

      {match(event.closedAt)
        .with(P.string.minLength(1), (closedAt) => (
          <p className="text-muted-foreground text-xs">
            Closed {formatDate(new Date(closedAt), "dateTime")}. Everyone expected without a
            check-in was marked absent.
          </p>
        ))
        .otherwise(() => null)}

      <EventDialog open={editing} onOpenChange={setEditing} event={event} />

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {event.title}?</AlertDialogTitle>
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
                remove.mutate(event.id, { onSuccess: () => window.location.assign("/events") })
              }
            >
              {match(remove.isPending)
                .with(true, () => "Deleting…" as const)
                .otherwise(() => "Delete" as const)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

function EventDetailBody(props: EventDetailProps) {
  const event = useEvent(props.eventId);

  return match(event)
    .with({ isPending: true }, () => (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    ))
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <>
        <Header event={data} role={props.role} />

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Expected" value={data.counts.expected} />
          <Stat label="Present" value={data.counts.present} />
          <Stat label="Late" value={data.counts.late} />
          <Stat label="Excused" value={data.counts.excused} />
          <Stat label="Absent" value={data.counts.absent} />
        </div>

        <EventRecords event={data} />
      </>
    ))
    .otherwise(() => null);
}

export function EventDetail(props: EventDetailProps) {
  return (
    <Providers>
      <EventDetailBody {...props} />
    </Providers>
  );
}
