import { formatRange } from "@absqir/core/date";
import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { match, P } from "ts-pattern";
import { CheckInLine } from "@/components/shared/check-in-line";
import { DayBlock } from "@/components/shared/day-block";
import { ListCard, ListCardTitle } from "@/components/shared/list-card";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { useOrgHref } from "@/lib/org-path";
import type { HistoryRow } from "@/queries/use-my";

export interface MyHistoryCardProps {
  row: HistoryRow;
}

/** The sentence for how a record came to be. */
function methodLabel(t: Translate, method: string): string {
  return match(method)
    .with("screen", () => t("common:checkInMethod.screen"))
    .with("scanner", () => t("common:checkInMethod.scanner"))
    .with("manual", () => t("common:checkInMethod.manual"))
    .otherwise(() => t("common:checkInMethod.auto"));
}

/** One past event and what my record says about it, as a row in the list. */
export function MyHistoryCard(props: MyHistoryCardProps) {
  const t = useTranslate();
  const orgHref = useOrgHref();
  const { row } = props;
  const startsAt = new Date(row.startsAt);

  return (
    <ListCard link>
      <DayBlock at={startsAt} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <ListCardTitle
          href={orgHref(`/events/${row.eventId}`)}
          title={row.title}
          aside={<AttendanceStatusBadge status={row.status} />}
        />

        <p className="text-muted-foreground text-xs tabular-nums">
          {formatRange(startsAt, new Date(row.endsAt))}
        </p>

        <CheckInLine
          checkedInAt={row.checkedInAt}
          checkedIn={(time) => t("my:history.checkedInAt", { time })}
          missed={t("my:history.noCheckIn")}
          method={methodLabel(t, row.method)}
        />

        {match(row.note)
          .with(P.string.minLength(1), (note) => (
            <p className="border-border text-muted-foreground mt-0.5 border-l-2 pl-2 text-xs">
              {note}
            </p>
          ))
          .otherwise(() => null)}
      </div>
    </ListCard>
  );
}
