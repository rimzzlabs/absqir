/**
 * One reading of the room, from the counts an event carries.
 *
 * The page states these numbers in two places, the summary and the warning
 * before a close, and both must agree. Pure, so the arithmetic has a test
 * instead of living twice in two components.
 */

export interface AttendanceCounts {
  expected: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
}

export interface AttendanceReading {
  /** Present plus late: everyone who turned up. */
  checkedIn: number;
  /** Everyone who carries a record of any kind. */
  recorded: number;
  /** The roster. A walk-in lands outside the expected list, so it can grow. */
  total: number;
  /** Nobody has written a record for these people yet. */
  notYet: number;
}

export function readAttendance(counts: AttendanceCounts): AttendanceReading {
  const recorded = counts.present + counts.late + counts.excused + counts.absent;
  const total = Math.max(counts.expected, recorded);

  return {
    checkedIn: counts.present + counts.late,
    recorded,
    total,
    notYet: total - recorded,
  };
}
