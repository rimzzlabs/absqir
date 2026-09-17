import { A } from "@mobily/ts-belt";

export interface Attendee {
  id: string;
  name: string;
}

export interface RosterParams {
  /** Everyone expected, through a group or a registration. */
  expected: readonly Attendee[];
  /** Everyone with a present or late record, expected or not. */
  checkedIn: readonly string[];
}

export interface Roster {
  expectedTotal: number;
  /** Never above `expectedTotal`: a walk-in nobody expected does not count. */
  checkedInCount: number;
}

/**
 * What a member may read about who else is coming: two numbers.
 *
 * The names come from the roster endpoint, one page at a time, so the detail
 * carries no list of its own. No email, no identifier, and no per-person
 * status anywhere: what each person did stays between them and the
 * organizer.
 */
export function buildRoster(params: RosterParams): Roster {
  const expectedIds = new Set(A.map(params.expected, (row) => row.id));

  return {
    expectedTotal: params.expected.length,
    checkedInCount: A.filter(params.checkedIn, (id) => expectedIds.has(id)).length,
  };
}
