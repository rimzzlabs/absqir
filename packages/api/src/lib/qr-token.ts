/**
 * The QR code rotates: the token is an HMAC over the session id and the
 * current time window. A screenshot of the code therefore expires within one
 * window, while a phone camera pointed at the live screen always works.
 */
export const QR_TOKEN_WINDOW_SECONDS = 20;

const encoder = new TextEncoder();

interface SignWindowParams {
  secret: string;
  sessionId: string;
  window: number;
}

async function signWindow(params: SignWindowParams): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(params.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const payload = encoder.encode(`${params.sessionId}.${params.window}`);
  const signature = await crypto.subtle.sign("HMAC", key, payload);

  return base64Url(new Uint8Array(signature).slice(0, 16));
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function windowAt(now: Date): number {
  return Math.floor(now.getTime() / 1000 / QR_TOKEN_WINDOW_SECONDS);
}

export interface CreateQrTokenParams {
  secret: string;
  sessionId: string;
  now?: Date;
}

export interface QrToken {
  token: string;
  expiresAt: Date;
}

export async function createQrToken(params: CreateQrTokenParams): Promise<QrToken> {
  const now = params.now ?? new Date();
  const window = windowAt(now);

  return {
    token: await signWindow({ secret: params.secret, sessionId: params.sessionId, window }),
    expiresAt: new Date((window + 1) * QR_TOKEN_WINDOW_SECONDS * 1000),
  };
}

export interface VerifyQrTokenParams {
  secret: string;
  sessionId: string;
  token: string;
  now?: Date;
}

/**
 * Accepts the current window and the one before it, so a scan that lands just
 * after a rotation still checks in.
 */
export async function verifyQrToken(params: VerifyQrTokenParams): Promise<boolean> {
  const now = params.now ?? new Date();
  const current = windowAt(now);

  const candidates = await Promise.all(
    [current, current - 1].map((window) =>
      signWindow({ secret: params.secret, sessionId: params.sessionId, window }),
    ),
  );

  return candidates.some((candidate) => candidate === params.token);
}
