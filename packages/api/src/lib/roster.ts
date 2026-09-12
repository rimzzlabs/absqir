import { A } from "@mobily/ts-belt";

/** Names past this point stay off the page. A thousand-name list helps nobody. */
export const ROSTER_LIMIT = 100;

export interface Attendee {
  id: string;
  name: string;
}

export interface RosterParams {
  /** Everyone expected, through a group or a registration, sorted by name. */
  expected: readonly Attendee[];
  /** The reader. Their own name never falls off the end of the list. */
  meId: string;
  /** Everyone with a present or late record, expected or not. */
  checkedIn: readonly string[];
}

export interface Roster {
  attendees: Attendee[];
  /** Everyone expected, even the names past the cap. */
  expectedTotal: number;
  /** Never above `expectedTotal`: a walk-in nobody expected does not count. */
  checkedInCount: number;
}

function capNames(sorted: readonly Attendee[], meId: string): Attendee[] {
  if (sorted.length <= ROSTER_LIMIT) return [...sorted];

  const head = sorted.slice(0, ROSTER_LIMIT);
  if (A.some(head, (row) => row.id === meId)) return head;

  const me = A.find(sorted, (row) => row.id === meId);
  if (!me) return head;

  // The list is sorted, and a reader past the cap sorts after every name in
  // the head. Their name goes last and the order still holds.
  return [...sorted.slice(0, ROSTER_LIMIT - 1), me];
}

/**
 * What a member may read about who else is coming: the names, one headcount,
 * and nothing else. No email, no identifier, and no per-person status.
 */
export function buildRoster(params: RosterParams): Roster {
  const expectedIds = new Set(A.map(params.expected, (row) => row.id));

  return {
    attendees: capNames(params.expected, params.meId),
    expectedTotal: params.expected.length,
    checkedInCount: A.filter(params.checkedIn, (id) => expectedIds.has(id)).length,
  };
}
