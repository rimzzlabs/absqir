import { O, pipe } from "@mobily/ts-belt";

export interface CheckInLink {
  eventId: string;
  token: string;
}

const LINK_PATH = /^\/a\/([^/]+)$/;

/**
 * Reads what the room screen encodes: a link to /a/<event> with the
 * rotating token in `t`. Anything else, a pass or a stray URL, is None.
 */
export function parseCheckInLink(text: string, origin = "http://localhost"): O.Option<CheckInLink> {
  return pipe(
    O.fromExecution(() => new URL(text.trim(), origin)),
    O.flatMap((url: URL) =>
      // The path and the token must both be there. One without the other is
      // some other link on this site, not a check-in.
      O.zip(
        O.fromNullable(LINK_PATH.exec(url.pathname)?.[1]),
        O.fromNullable(url.searchParams.get("t")),
      ),
    ),
    O.map(([id, token]) => ({ eventId: decodeURIComponent(id), token })),
  );
}
