import { describe, expect, it } from "vitest";
import { createPass, parsePass, verifyPass } from "#src/lib/member-pass";

const secret = "s".repeat(64);

describe("member pass", () => {
  it("round-trips through create, parse, verify", async () => {
    const code = await createPass({ secret, eventId: "sess-1", personId: "pers-1" });
    const parsed = parsePass(code);

    expect(parsed).toEqual({
      eventId: "sess-1",
      personId: "pers-1",
      signature: expect.any(String),
    });
    expect(parsed && (await verifyPass(secret, parsed))).toBe(true);
  });

  it("rejects a pass signed with another secret", async () => {
    const code = await createPass({ secret: "other", eventId: "sess-1", personId: "pers-1" });
    const parsed = parsePass(code);

    expect(parsed && (await verifyPass(secret, parsed))).toBe(false);
  });

  it("rejects a pass whose person was swapped", async () => {
    const code = await createPass({ secret, eventId: "sess-1", personId: "pers-1" });
    const parsed = parsePass(code.replace("pers-1", "pers-2"));

    expect(parsed && (await verifyPass(secret, parsed))).toBe(false);
  });

  it("ignores anything that is not a pass", () => {
    expect(parsePass("https://example.com")).toBeNull();
    expect(parsePass("absqir1:only.two")).toBeNull();
  });
});
