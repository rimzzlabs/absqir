import { readAttendance } from "@absqir/core/attendance-counts";
import { formatNumber } from "@absqir/core/numbers";
import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { match } from "ts-pattern";
import { type AttendanceStatus, attendanceLabel } from "@/components/shared/status-badge";
import type { Event } from "@/queries/use-events";

export interface EventAttendanceProps {
  event: Event;
}

/** One part of the bar, and one line of the legend. */
interface Slice {
  key: string;
  label: string;
  value: number;
  tone: string;
}

/** The same colours the row badges carry, as solid fills. */
const TONES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500",
  late: "bg-amber-500",
  excused: "bg-sky-500",
  absent: "bg-destructive",
};

const ORDER: AttendanceStatus[] = ["present", "late", "excused", "absent"];

function slicesOf(t: Translate, event: Event): readonly Slice[] {
  return A.map(
    ORDER,
    (status): Slice => ({
      key: status,
      label: attendanceLabel(t, status),
      value: event.counts[status],
      tone: TONES[status],
    }),
  );
}

/**
 * One reading of the room, not five cards of zeros.
 *
 * The number that answers "how is it going" is how many people are in, out
 * of how many are expected. The split into present, late, excused and absent
 * only appears once something is recorded, because before that it is four
 * zeros that say nothing.
 */
export function EventAttendance(props: EventAttendanceProps) {
  const { event } = props;
  const t = useTranslate();

  const slices = slicesOf(t, event);
  const { checkedIn, recorded, total, notYet } = readAttendance(event.counts);

  const filled = A.filter(slices, (slice) => slice.value > 0);

  const legend = A.concat(
    filled,
    match(notYet > 0)
      .with(true, () => [
        {
          key: "notYet",
          label: t("events:detail.attendance.notYet"),
          value: notYet,
          tone: "bg-muted-foreground/30",
        },
      ])
      .otherwise((): readonly Slice[] => []),
  );

  return (
    <section aria-labelledby="attendance-heading" className="border-border rounded-xl border p-4">
      <h2 id="attendance-heading" className="text-sm font-medium">
        {t("events:detail.attendance.heading")}
      </h2>

      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="font-heading text-3xl font-semibold tabular-nums">
          {formatNumber(checkedIn)}
        </span>
        <span className="text-muted-foreground text-sm">
          {t("events:detail.attendance.checkedIn")}{" "}
          {t("events:detail.attendance.expected", { count: total })}
        </span>
      </p>

      <div aria-hidden className="bg-muted mt-3 flex h-2 w-full overflow-hidden rounded-full">
        {A.map(filled, (slice) => (
          <div
            key={slice.key}
            className={cn("h-full", slice.tone)}
            style={{ width: `${(slice.value / Math.max(total, 1)) * 100}%` }}
          />
        ))}
      </div>

      {match(recorded)
        .with(0, () => null)
        .otherwise(() => (
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {A.map(legend, (slice) => (
              <div key={slice.key} className="flex items-center gap-1.5 text-sm">
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", slice.tone)} />
                <dt className="text-muted-foreground">{slice.label}</dt>
                <dd className="font-medium tabular-nums">{formatNumber(slice.value)}</dd>
              </div>
            ))}
          </dl>
        ))}
    </section>
  );
}
