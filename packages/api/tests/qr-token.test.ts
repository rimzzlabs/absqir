import { describe, expect, it } from "vitest";
import { createQrToken, QR_TOKEN_WINDOW_SECONDS, verifyQrToken } from "#src/lib/qr-token";

const secret = "a".repeat(64);
const eventId = "event-1";
const windowMs = QR_TOKEN_WINDOW_SECONDS * 1000;

describe("createQrToken", () => {
  it("expires at the end of the current window", async () => {
    const now = new Date("2026-09-08T10:00:05Z");
    const { expiresAt } = await createQrToken({ secret, eventId, now });

    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    expect(expiresAt.getTime() - now.getTime()).toBeLessThanOrEqual(windowMs);
  });

  it("signs each window differently", async () => {
    const now = new Date("2026-09-08T10:00:05Z");
    const later = new Date(now.getTime() + windowMs);

    const first = await createQrToken({ secret, eventId, now });
    const second = await createQrToken({ secret, eventId, now: later });

    expect(first.token).not.toBe(second.token);
  });
});

describe("verifyQrToken", () => {
  it("accepts a token from the current window", async () => {
    const now = new Date("2026-09-08T10:00:05Z");
    const { token } = await createQrToken({ secret, eventId, now });

    await expect(verifyQrToken({ secret, eventId, token, now })).resolves.toBe(true);
  });

  it("accepts a token from the previous window", async () => {
    const now = new Date("2026-09-08T10:00:05Z");
    const { token } = await createQrToken({ secret, eventId, now });
    const later = new Date(now.getTime() + windowMs);

    await expect(verifyQrToken({ secret, eventId, token, now: later })).resolves.toBe(true);
  });

  it("rejects a token two windows old", async () => {
    const now = new Date("2026-09-08T10:00:05Z");
    const { token } = await createQrToken({ secret, eventId, now });
    const later = new Date(now.getTime() + 2 * windowMs);

    await expect(verifyQrToken({ secret, eventId, token, now: later })).resolves.toBe(false);
  });

  it("rejects a token signed for another event", async () => {
    const now = new Date("2026-09-08T10:00:05Z");
    const { token } = await createQrToken({ secret, eventId: "event-2", now });

    await expect(verifyQrToken({ secret, eventId, token, now })).resolves.toBe(false);
  });

  it("rejects a token signed with another secret", async () => {
    const now = new Date("2026-09-08T10:00:05Z");
    const { token } = await createQrToken({ secret: "b".repeat(64), eventId, now });

    await expect(verifyQrToken({ secret, eventId, token, now })).resolves.toBe(false);
  });
});
