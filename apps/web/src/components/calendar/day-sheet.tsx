import { formatDate } from "@absqir/core/date";
import { useTranslate } from "@absqir/i18n/react";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@absqir/ui/sheet";
import { A } from "@mobily/ts-belt";
import { PlusIcon, RepeatIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { type CalendarEntry, dayKey } from "@/components/calendar/calendar-entries";
import { EventStatusBadge } from "@/components/shared/status-badge";
import { useOrgHref } from "@/lib/org-path";

export interface DaySheetProps {
  /** Null keeps the sheet closed. */
  day: Date | null;
  entries: Map<string, CalendarEntry[]>;
  onClose: () => void;
  onNewEvent: (day: Date) => void;
}

/** Everything on one day, with the room to say more than a cell can. */
export function DaySheet(props: DaySheetProps) {
  const t = useTranslate();
  const orgHref = useOrgHref();
  const entries = match(props.day)
    .with(P.nullish, () => [])
    .otherwise((day) => props.entries.get(dayKey(day)) ?? []);

  return (
    <Sheet open={props.day !== null} onOpenChange={(next) => !next && props.onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {match(props.day)
              .with(P.nullish, () => "" as const)
              .otherwise((day) => formatDate(day, "date"))}
          </SheetTitle>
          <SheetDescription>
            {match(entries.length)
              .with(0, () => t("calendar:sheet.empty"))
              .otherwise((count) => t("calendar:sheet.count", { count }))}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {A.map(entries, (entry) =>
            match(entry)
              .with({ kind: "event" }, (entry) => (
                <a
                  key={entry.key}
                  href={orgHref(`/events/${entry.event.id}`)}
                  className="border-border hover:bg-muted/40 block rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{entry.event.title}</span>
                    <EventStatusBadge status={entry.event.status} />
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                    {t("calendar:sheet.range", {
                      from: formatDate(entry.startsAt, "time"),
                      to: formatDate(entry.endsAt, "time"),
                    })}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("calendar:sheet.counts", {
                      expected: entry.event.counts.expected,
                      present: entry.event.counts.present,
                      late: entry.event.counts.late,
                      absent: entry.event.counts.absent,
                    })}
                  </p>
                  {match(entry.event.groups.length > 0)
                    .with(true, () => (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {A.map(entry.event.groups, (group) => (
                          <Badge key={group.id} variant="outline">
                            {group.name}
                          </Badge>
                        ))}
                      </div>
                    ))
                    .otherwise(() => null)}
                </a>
              ))
              .otherwise((entry) => (
                <div key={entry.key} className="border-border rounded-lg border border-dashed p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground font-medium">{entry.title}</span>
                    <Badge variant="outline" className="text-muted-foreground">
                      <RepeatIcon />
                      {t("calendar:sheet.fromSchedule")}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                    {t("calendar:sheet.range", {
                      from: formatDate(entry.startsAt, "time"),
                      to: formatDate(entry.endsAt, "time"),
                    })}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("calendar:sheet.projectedHint")}
                  </p>
                </div>
              )),
          )}
        </SheetBody>

        <SheetFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => props.day && props.onNewEvent(props.day)}
          >
            <PlusIcon />
            {t("calendar:sheet.newEvent")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
