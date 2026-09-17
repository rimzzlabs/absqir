import { formatDate, formatRange } from "@absqir/core/date";
import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { cn } from "@absqir/ui/lib/utils";
import { CheckCircleIcon, MinusCircleIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { STRETCHED_LINK } from "@/components/shared/stretched-link";
import { useOrgHref } from "@/lib/org-path";
import type { HistoryRow } from "@/queries/use-my";

export interface MyHistoryCardProps {
  row: HistoryRow;
}

/** The day, as a block a reader scans down the list without reading. */
function DayBlock(props: { at: Date; showYear: boolean }) {
  return (
    <div className="bg-muted/50 flex w-13 max-h-max flex-col items-center rounded-lg px-1 py-1.5">
      <span className="text-muted-foreground text-[0.625rem] leading-none tracking-wide uppercase">
        {formatDate(props.at, "month")}
      </span>
      <span className="mt-0.5 text-xl leading-none font-semibold tabular-nums">
        {formatDate(props.at, "dayOfMonth")}
      </span>
      <span className="text-muted-foreground mt-1 text-[0.625rem] leading-none tabular-nums">
        {match(props.showYear)
          .with(true, () => formatDate(props.at, "year"))
          .otherwise(() => formatDate(props.at, "weekday"))}
      </span>
    </div>
  );
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
  const endsAt = new Date(row.endsAt);
  // The year only when this year does not explain it, so a list of recent
  // events stays quiet and an old one still says when it happened.
  const showYear = formatDate(startsAt, "year") !== formatDate(new Date(), "year");

  return (
    <li className="ring-foreground/10 hover:bg-accent/40 relative isolate flex gap-3 overflow-hidden rounded-xl bg-card p-3 text-card-foreground ring-1 transition-colors sm:gap-4 sm:p-4">
      <DayBlock at={startsAt} showYear={showYear} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <a
            href={orgHref(`/events/${row.eventId}`)}
            className={cn(STRETCHED_LINK, "line-clamp-2 text-sm leading-snug font-medium")}
          >
            {row.title}
          </a>
          <span className="shrink-0">
            <AttendanceStatusBadge status={row.status} />
          </span>
        </div>

        <p className="text-muted-foreground text-xs tabular-nums">
          {formatRange(startsAt, endsAt)}
        </p>

        <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
          {match(row.checkedInAt)
            .with(P.string.minLength(1), (checkedInAt) => (
              <>
                <CheckCircleIcon aria-hidden className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-foreground tabular-nums">
                  {t("my:history.checkedInAt", { time: formatDate(new Date(checkedInAt), "time") })}
                </span>
              </>
            ))
            .otherwise(() => (
              <>
                <MinusCircleIcon aria-hidden />
                <span>{t("my:history.noCheckIn")}</span>
              </>
            ))}
          <span aria-hidden>·</span>
          <span>{methodLabel(t, row.method)}</span>
        </p>

        {match(row.note)
          .with(P.string.minLength(1), (note) => (
            <p className="border-border text-muted-foreground mt-0.5 border-l-2 pl-2 text-xs">
              {note}
            </p>
          ))
          .otherwise(() => null)}
      </div>
    </li>
  );
}
