export interface CheckInLink {
  sessionId: string;
  token: string;
}

/**
 * Reads what the room screen encodes: a link to /a/<session> with the
 * rotating token in `t`. Anything else, a pass or a stray URL, is null.
 */
export function parseCheckInLink(text: string, origin = "http://localhost"): CheckInLink | null {
  let url: URL;
  try {
    url = new URL(text.trim(), origin);
  } catch {
    return null;
  }

  const match = /^\/a\/([^/]+)$/.exec(url.pathname);
  const token = url.searchParams.get("t");
  if (!match?.[1] || !token) return null;

  return { sessionId: decodeURIComponent(match[1]), token };
}
