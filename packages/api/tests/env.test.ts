import { describe, expect, it } from "vitest";
import type { ApiBindings } from "@/bindings";
import { docsEnabled, isProduction, parseEnv } from "@/env";

const SECRET = "a".repeat(32);

function bindings(overrides: Partial<ApiBindings> = {}): ApiBindings {
  return {
    HYPERDRIVE: { connectionString: "postgresql://localhost:5432/absqir" },
    BETTER_AUTH_SECRET: SECRET,
    ...overrides,
  };
}

describe("parseEnv", () => {
  it("rejects a secret shorter than 32 characters", () => {
    expect(() => parseEnv(bindings({ BETTER_AUTH_SECRET: "too-short" }))).toThrow();
  });

  it("treats an empty string as unset", () => {
    const env = parseEnv(bindings({ RESEND_API_KEY: "" }));

    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  it("keeps a supplied Resend key", () => {
    const env = parseEnv(bindings({ RESEND_API_KEY: "re_test" }));

    expect(env.RESEND_API_KEY).toBe("re_test");
  });

  it("defaults the environment to development", () => {
    const env = parseEnv(bindings());

    expect(env.ENVIRONMENT).toBe("development");
    expect(isProduction(env)).toBe(false);
  });

  it("serves docs off production and hides them on production", () => {
    expect(docsEnabled(parseEnv(bindings()))).toBe(true);
    expect(docsEnabled(parseEnv(bindings({ ENVIRONMENT: "production" })))).toBe(false);
  });

  it("lets ENABLE_DOCS override production", () => {
    const env = parseEnv(bindings({ ENVIRONMENT: "production", ENABLE_DOCS: "true" }));

    expect(docsEnabled(env)).toBe(true);
  });

  it("caches the parse per bindings object", () => {
    const shared = bindings();

    expect(parseEnv(shared)).toBe(parseEnv(shared));
  });
});
