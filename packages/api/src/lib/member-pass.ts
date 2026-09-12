/**
 * The pass a member shows at the door: a QR the organizer's scanner reads.
 * Signed with the event secret, bound to one person and one event, so
 * a screenshot passed around only ever checks in the person it names.
 */
const PREFIX = "absqir1";
const encoder = new TextEncoder();

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return base64Url(new Uint8Array(signature).slice(0, 20));
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export interface PassParams {
  secret: string;
  eventId: string;
  personId: string;
}

export async function createPass(params: PassParams): Promise<string> {
  const payload = `${params.eventId}.${params.personId}`;
  const signature = await sign(params.secret, payload);

  return `${PREFIX}:${payload}.${signature}`;
}

export interface ParsedPass {
  eventId: string;
  personId: string;
  signature: string;
}

export function parsePass(code: string): ParsedPass | null {
  if (!code.startsWith(`${PREFIX}:`)) return null;

  const parts = code.slice(PREFIX.length + 1).split(".");
  if (parts.length !== 3) return null;

  const [eventId, personId, signature] = parts;
  if (!eventId || !personId || !signature) return null;

  return { eventId, personId, signature };
}

export async function verifyPass(secret: string, pass: ParsedPass): Promise<boolean> {
  const expected = await sign(secret, `${pass.eventId}.${pass.personId}`);

  return expected === pass.signature;
}
