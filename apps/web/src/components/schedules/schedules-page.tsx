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
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { PencilSimpleIcon, PlusIcon, RepeatIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { ScheduleDialog } from "@/components/schedules/schedule-dialog";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";
import { useRemoveSchedule } from "@/mutations/use-remove-schedule";
import { type Schedule, useSchedules } from "@/queries/use-schedules";

export interface SchedulesPageProps {
  role: RoleName;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function describe(schedule: Schedule): string {
  const when =
    schedule.frequency === "daily"
      ? "Every day"
      : A.map(schedule.weekdays, (day) => DAY_LABELS[day]).join(", ");
  const end = schedule.endsOn ? ` until ${schedule.endsOn}` : "";

  return `${when} at ${schedule.startTime}, ${schedule.durationMinutes} min, from ${schedule.startsOn}${end} (${schedule.timezone})`;
}

function ScheduleCard(props: { schedule: Schedule; canManage: boolean }) {
  const { schedule } = props;
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const remove = useRemoveSchedule();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {schedule.title}
          {schedule.active ? null : <Badge variant="outline">Paused</Badge>}
        </CardTitle>
        <CardDescription>{describe(schedule)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {A.map(schedule.groups, (group) => (
          <Badge key={group.id} variant="outline">
            {group.name}
          </Badge>
        ))}
        {schedule.groups.length === 0 ? (
          <span className="text-muted-foreground text-xs">
            No group yet, so nobody is expected.
          </span>
        ) : null}
        {props.canManage ? (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <PencilSimpleIcon />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRemoving(true)}>
              <TrashIcon />
              Delete
            </Button>
          </div>
        ) : null}
      </CardContent>

      <ScheduleDialog open={editing} onOpenChange={setEditing} schedule={schedule} />

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {schedule.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Future events it created and nobody touched go with it. Past ones stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormError error={remove.error} />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(schedule.id, { onSuccess: () => setRemoving(false) })}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SchedulesBody(props: SchedulesPageProps) {
  const schedules = useSchedules();
  const [creating, setCreating] = useState(false);
  const canManage = props.role === "owner" || props.role === "admin";

  return (
    <>
      <PageHeader
        title="Schedules"
        description="Rules that create events on their own. Each spawns two weeks ahead and keeps going."
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              New schedule
            </Button>
          ) : null
        }
      />

      {match(schedules)
        .with({ isPending: true }, () => <Skeleton className="h-32 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          rows.length === 0 ? (
            <Empty className="border-border rounded-xl border border-dashed py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RepeatIcon />
                </EmptyMedia>
                <EmptyTitle>No schedule yet</EmptyTitle>
                <EmptyDescription>
                  Every weekday at nine, every Tuesday evening: set the rule once and the events
                  appear by themselves.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {A.map(rows, (schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} canManage={canManage} />
              ))}
            </div>
          ),
        )
        .otherwise(() => null)}

      <ScheduleDialog open={creating} onOpenChange={setCreating} schedule={null} />
    </>
  );
}

export function SchedulesPage(props: SchedulesPageProps) {
  return (
    <Providers>
      <SchedulesBody {...props} />
    </Providers>
  );
}
