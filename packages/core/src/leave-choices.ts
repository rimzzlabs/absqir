/**
 * Which events a member may still ask to be excused from.
 *
 * Three rules, and all three have to hold: the event is not over, the member
 * has no record on it yet, and they have not already asked about it. The
 * picker offers the answer, so the rule lives here rather than inline in it.
 */

export interface AskableEvent {
  id: string;
  /** "scheduled", "running" or "done". */
  status: string;
  /** What the member's attendance record says, if there is one. */
  record: unknown;
}

/** True when this one event is still worth offering. */
export function isAskable(event: AskableEvent, asked: ReadonlySet<string>): boolean {
  return event.status !== "done" && !event.record && !asked.has(event.id);
}

/** The events to offer, in the order they arrived. */
export function askableEvents<T extends AskableEvent>(
  events: readonly T[],
  askedEventIds: Iterable<string>,
): T[] {
  const asked = new Set(askedEventIds);

  return events.filter((event) => isAskable(event, asked));
}
