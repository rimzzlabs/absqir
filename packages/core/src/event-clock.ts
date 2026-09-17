/**
 * The two moments an event's own clock decides: when check-in opens, and
 * when a check-in stops counting as present.
 *
 * Both the API and the web app read these. The API judges a scan by them;
 * the page tells the organizer the times out loud, so nobody has to add
 * minutes to a start time in their head.
 */

const MINUTE = 60_000;

/** When check-in opens on its own. */
export function opensAt(event: { startsAt: Date; opensBeforeMinutes: number }): Date {
  return new Date(event.startsAt.getTime() - event.opensBeforeMinutes * MINUTE);
}

/** The last instant a check-in counts as present. */
export function lateAt(event: { startsAt: Date; lateAfterMinutes: number }): Date {
  return new Date(event.startsAt.getTime() + event.lateAfterMinutes * MINUTE);
}
