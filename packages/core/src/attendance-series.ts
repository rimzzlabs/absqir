import { A } from "@mobily/ts-belt";

/**
 * Turns a report table into the points a chart draws. Pure, so the shaping
 * rules have a test of their own and the chart island only paints.
 *
 * A rate is null until an event closes, because the absent rows are written at
 * the close. A null point is not a zero, so it stays off the chart.
 */

/** One point: the label under the axis and the rate as a whole percent. */
export interface RatePoint {
  key: string;
  label: string;
  /** A whole percent, 0 to 100. */
  percent: number;
}

export interface EventRateRow {
  eventId: string;
  title: string;
  startsAt: string;
  attendanceRate: number | null;
}

export interface GroupRateRow {
  groupId: string;
  name: string;
  attendanceRate: number | null;
}

function percentOf(rate: number): number {
  return Math.round(rate * 100);
}

/**
 * Attendance per event, oldest first, so the line runs the way the reader
 * reads. The report hands rows over newest first.
 */
export function eventRateSeries(rows: readonly EventRateRow[]): RatePoint[] {
  const judged = A.filter(rows, (row) => row.attendanceRate !== null);
  const byTime = A.sortBy(judged, (row) => row.startsAt);

  return [
    ...A.map(byTime, (row) => ({
      key: row.eventId,
      label: row.title,
      percent: percentOf(row.attendanceRate ?? 0),
    })),
  ];
}

/** Attendance by group, worst first, so the group that needs a look is on top. */
export function groupRateSeries(rows: readonly GroupRateRow[]): RatePoint[] {
  const judged = A.filter(rows, (row) => row.attendanceRate !== null);
  const worstFirst = A.sortBy(judged, (row) => row.attendanceRate ?? 0);

  return [
    ...A.map(worstFirst, (row) => ({
      key: row.groupId,
      label: row.name,
      percent: percentOf(row.attendanceRate ?? 0),
    })),
  ];
}
