import type { Locale, Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
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
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
  role: RoleName;
}

/** The weekday numbers the API stores, as the keys under `schedules:days`. */
type DayKey = "0" | "1" | "2" | "3" | "4" | "5" | "6";

function describe(t: Translate, schedule: Schedule): string {
  const when = match(schedule.frequency)
    .with("daily", () => t("schedules:everyDay"))
    .otherwise(() =>
      A.map(schedule.weekdays, (day) => t(`schedules:days.${String(day) as DayKey}`)).join(", "),
    );
  const end = match(schedule.endsOn)
    .with(P.string.minLength(1), (endsOn) => t("schedules:until", { date: endsOn }))
    .otherwise(() => "" as const);

  return t("schedules:summary", {
    when,
    time: schedule.startTime,
    minutes: schedule.durationMinutes,
    start: schedule.startsOn,
    end,
    timezone: schedule.timezone,
  });
}

function ScheduleCard(props: { schedule: Schedule; canManage: boolean }) {
  const { schedule } = props;
  const t = useTranslate();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const remove = useRemoveSchedule();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {schedule.title}
          {match(schedule.active)
            .with(true, () => null)
            .otherwise(() => (
              <Badge variant="outline">{t("schedules:paused")}</Badge>
            ))}
        </CardTitle>
        <CardDescription>{describe(t, schedule)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {A.map(schedule.groups, (group) => (
          <Badge key={group.id} variant="outline">
            {group.name}
          </Badge>
        ))}
        {match(schedule.groups.length)
          .with(0, () => (
            <span className="text-muted-foreground text-xs">{t("schedules:noGroup")}</span>
          ))
          .otherwise(() => null)}
        {match(props.canManage)
          .with(true, () => (
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <PencilSimpleIcon />
                {t("common:actions.edit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRemoving(true)}>
                <TrashIcon />
                {t("common:actions.delete")}
              </Button>
            </div>
          ))
          .otherwise(() => null)}
      </CardContent>

      <ScheduleDialog open={editing} onOpenChange={setEditing} schedule={schedule} />

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("schedules:deleteTitle", { title: schedule.title })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("schedules:deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <FormError error={remove.error} />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("schedules:keep")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(schedule.id, { onSuccess: () => setRemoving(false) })}
            >
              {match(remove.isPending)
                .with(true, () => t("schedules:deleting"))
                .otherwise(() => t("common:actions.delete"))}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SchedulesBody(props: SchedulesPageProps) {
  const t = useTranslate();
  const schedules = useSchedules();
  const [creating, setCreating] = useState(false);
  const canManage = props.role === "owner" || props.role === "admin";

  return (
    <>
      <PageHeader
        title={t("schedules:title")}
        description={t("schedules:description")}
        actions={match(canManage)
          .with(true, () => (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              {t("schedules:new")}
            </Button>
          ))
          .otherwise(() => null)}
      />

      {match(schedules)
        .with({ isPending: true }, () => <Skeleton className="h-32 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          match(rows.length)
            .with(0, () => (
              <Empty className="border-border rounded-xl border border-dashed py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <RepeatIcon />
                  </EmptyMedia>
                  <EmptyTitle>{t("schedules:emptyTitle")}</EmptyTitle>
                  <EmptyDescription>{t("schedules:emptyDescription")}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ))
            .otherwise(() => (
              <div className="grid gap-4 lg:grid-cols-2">
                {A.map(rows, (schedule) => (
                  <ScheduleCard key={schedule.id} schedule={schedule} canManage={canManage} />
                ))}
              </div>
            )),
        )
        .otherwise(() => null)}

      <ScheduleDialog open={creating} onOpenChange={setCreating} schedule={null} />
    </>
  );
}

export function SchedulesPage(props: SchedulesPageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <SchedulesBody {...props} />
    </Providers>
  );
}
