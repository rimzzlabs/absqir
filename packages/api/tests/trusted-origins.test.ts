import { describe, expect, it } from "vitest";
import type { ApiBindings } from "#src/bindings";
import { trustedOriginsFor } from "#src/context";
import { type ApiEnv, parseEnv } from "#src/env";

const SECRET = "a".repeat(32);

function env(overrides: Partial<ApiBindings> = {}): ApiEnv {
  return parseEnv({
    HYPERDRIVE: { connectionString: "postgresql://localhost:5432/absqir" },
    BETTER_AUTH_SECRET: SECRET,
    ...overrides,
  });
}

const DEV = env();
const PROD = env({ ENVIRONMENT: "production", RESEND_API_KEY: "re_test" });
const PREVIEW = env({ ENVIRONMENT: "preview", RESEND_API_KEY: "re_test" });

const SERVED = "https://absqir.example";

describe("trustedOriginsFor", () => {
  it("trusts only the served address in production", () => {
    expect(trustedOriginsFor(PROD, SERVED, "https://evil.example")).toEqual([SERVED]);
  });

  it("trusts only the served address in preview", () => {
    expect(trustedOriginsFor(PREVIEW, SERVED, "https://evil.example")).toEqual([SERVED]);
  });

  it("adds the browser's address in development", () => {
    // What a phone on the LAN sends while the dev runtime reports localhost.
    expect(trustedOriginsFor(DEV, "https://localhost", "https://172.20.10.14:4321")).toEqual([
      "https://localhost",
      "https://172.20.10.14:4321",
    ]);
  });

  it("keeps the port the dev runtime drops", () => {
    expect(trustedOriginsFor(DEV, "https://localhost", "https://localhost:4321")).toEqual([
      "https://localhost",
      "https://localhost:4321",
    ]);
  });

  it("never repeats the served address", () => {
    expect(trustedOriginsFor(DEV, SERVED, SERVED)).toEqual([SERVED]);
  });

  it("ignores a request that states no origin", () => {
    expect(trustedOriginsFor(DEV, SERVED)).toEqual([SERVED]);
    expect(trustedOriginsFor(DEV, SERVED, null)).toEqual([SERVED]);
    expect(trustedOriginsFor(DEV, SERVED, "")).toEqual([SERVED]);
  });

  it("drops a header that is not an address", () => {
    expect(trustedOriginsFor(DEV, SERVED, "null")).toEqual([SERVED]);
    expect(trustedOriginsFor(DEV, SERVED, "not a url")).toEqual([SERVED]);
  });

  it("refuses a public address even in development", () => {
    expect(trustedOriginsFor(DEV, SERVED, "https://evil.example")).toEqual([SERVED]);
    expect(trustedOriginsFor(DEV, SERVED, "https://8.8.8.8")).toEqual([SERVED]);
    // 172.32 sits just outside the private block that 172.16 to 172.31 covers.
    expect(trustedOriginsFor(DEV, SERVED, "http://172.32.0.1:4321")).toEqual([SERVED]);
  });

  it("accepts every address this network can hold", () => {
    for (const local of [
      "http://127.0.0.1:4321",
      "http://10.1.2.3:4321",
      "http://192.168.1.9:4321",
      "http://172.16.0.4:4321",
      "http://172.31.255.254:4321",
      "https://macbook.local:4321",
      "http://[::1]:4321",
    ]) {
      expect(trustedOriginsFor(DEV, SERVED, local)).toEqual([SERVED, new URL(local).origin]);
    }
  });

  it("keeps only the origin of a header that carries a path", () => {
    expect(trustedOriginsFor(DEV, SERVED, "http://192.168.1.9:4321/a/b?t=1")).toEqual([
      SERVED,
      "http://192.168.1.9:4321",
    ]);
  });
});
