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
import { Button, buttonVariants } from "@absqir/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@absqir/ui/dropdown-menu";
import { cn } from "@absqir/ui/lib/utils";
import {
  CameraIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  PencilSimpleIcon,
  QrCodeIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { match } from "ts-pattern";
import { EventDialog } from "@/components/events/event-dialog";
import { FormError } from "@/components/shared/form-error";
import type { RoleName } from "@/components/shared/role-badge";
import { useOrgHref } from "@/lib/org-path";
import { useRemoveEvent } from "@/mutations/use-remove-event";
import type { Event } from "@/queries/use-events";

export interface EventActionsProps {
  event: Event;
  role: RoleName;
}

/**
 * The two ways to run the event, and everything else behind one menu.
 *
 * Six buttons of the same weight make the reader pick before they read. The
 * room screen is what an organizer opens most, the scanner is the fallback
 * at the door, and editing, the export and the delete are housekeeping.
 */
export function EventActions(props: EventActionsProps) {
  const { event } = props;
  const t = useTranslate();
  const orgHref = useOrgHref();
  const remove = useRemoveEvent();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const isAdmin = props.role === "owner" || props.role === "admin";

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      {match(event.status)
        .with("done", () => (
          <a
            href={`/api/events/${event.id}/records.csv`}
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "flex-1 sm:flex-none",
            )}
          >
            <DownloadSimpleIcon />
            {t("events:detail.csv")}
          </a>
        ))
        .otherwise(() => (
          <>
            <a
              href={orgHref(`/events/${event.id}/display`)}
              className={cn(buttonVariants({ size: "sm" }), "flex-1 sm:flex-none")}
            >
              <QrCodeIcon />
              {t("events:detail.roomScreen")}
            </a>
            <a
              href={orgHref(`/events/${event.id}/scan`)}
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "flex-1 sm:flex-none",
              )}
            >
              <CameraIcon />
              {t("events:detail.scanner")}
            </a>
          </>
        ))}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon-sm" aria-label={t("events:detail.more")} />}
        >
          <DotsThreeIcon weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <PencilSimpleIcon />
            {t("common:actions.edit")}
          </DropdownMenuItem>
          {match(event.status)
            .with("done", () => null)
            .otherwise(() => (
              <DropdownMenuItem render={<a href={`/api/events/${event.id}/records.csv`} />}>
                <DownloadSimpleIcon />
                {t("events:detail.csv")}
              </DropdownMenuItem>
            ))}
          {match(isAdmin)
            .with(true, () => (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setRemoving(true)}>
                  <TrashIcon />
                  {t("common:actions.delete")}
                </DropdownMenuItem>
              </>
            ))
            .otherwise(() => null)}
        </DropdownMenuContent>
      </DropdownMenu>

      <EventDialog open={editing} onOpenChange={setEditing} event={event} />

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("events:detail.deleteTitle", { title: event.title })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("events:detail.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <FormError error={remove.error} />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("events:detail.keep")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(event.id, {
                  onSuccess: () => window.location.assign(orgHref("/events")),
                })
              }
            >
              {match(remove.isPending)
                .with(true, () => t("events:detail.deleting"))
                .otherwise(() => t("common:actions.delete"))}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
