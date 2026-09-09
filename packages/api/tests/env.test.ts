import { describe, expect, it } from "vitest";
import type { ApiBindings } from "@/bindings";
import { docsEnabled, enabledSocialProviders, isProduction, parseEnv } from "@/env";

const SECRET = "a".repeat(32);

function bindings(overrides: Partial<ApiBindings> = {}): ApiBindings {
  return {
    HYPERDRIVE: { connectionString: "postgresql://localhost:5432/absqir" },
    BETTER_AUTH_SECRET: SECRET,
    ...overrides,
  };
}

/** Production needs a mail provider, so every production case sets one. */
function production(overrides: Partial<ApiBindings> = {}): ApiBindings {
  return bindings({ ENVIRONMENT: "production", RESEND_API_KEY: "re_test", ...overrides });
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
    expect(docsEnabled(parseEnv(production()))).toBe(false);
  });

  it("lets ENABLE_DOCS override production", () => {
    const env = parseEnv(production({ ENABLE_DOCS: "true" }));

    expect(docsEnabled(env)).toBe(true);
  });

  it("requires a mail provider in production", () => {
    expect(() => parseEnv(bindings({ ENVIRONMENT: "production" }))).toThrow();
    expect(() => parseEnv(production())).not.toThrow();
  });

  it("refuses a provider that holds one key only", () => {
    // t3-env wraps every issue in one message. The named key reaches the
    // operator through the log it prints beside it.
    expect(() => parseEnv(bindings({ GITHUB_CLIENT_ID: "id" }))).toThrow();
    expect(() => parseEnv(bindings({ GITHUB_CLIENT_SECRET: "shh" }))).toThrow();
    expect(() => parseEnv(bindings({ GOOGLE_CLIENT_ID: "id" }))).toThrow();
    expect(() => parseEnv(bindings({ GOOGLE_CLIENT_SECRET: "shh" }))).toThrow();
  });

  it("accepts a complete pair, and no keys at all", () => {
    expect(() =>
      parseEnv(bindings({ GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "shh" })),
    ).not.toThrow();
    expect(() => parseEnv(bindings())).not.toThrow();
  });

  it("treats a blank key as unset, so a half-filled template still starts", () => {
    expect(() =>
      parseEnv(bindings({ GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "" })),
    ).not.toThrow();
  });

  it("caches the parse per bindings object", () => {
    const shared = bindings();

    expect(parseEnv(shared)).toBe(parseEnv(shared));
  });
});

describe("enabledSocialProviders", () => {
  it("is empty when the operator set no keys", () => {
    expect(enabledSocialProviders(bindings())).toEqual([]);
  });

  it("lists only the provider whose pair is set", () => {
    expect(
      enabledSocialProviders(bindings({ GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "shh" })),
    ).toEqual(["github"]);

    expect(
      enabledSocialProviders(bindings({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "shh" })),
    ).toEqual(["google"]);
  });

  it("keeps a stable order when both are set", () => {
    const both = bindings({
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "shh",
      GITHUB_CLIENT_ID: "id",
      GITHUB_CLIENT_SECRET: "shh",
    });

    expect(enabledSocialProviders(both)).toEqual(["github", "google"]);
  });

  it("ignores a blank pair", () => {
    expect(
      enabledSocialProviders(bindings({ GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "" })),
    ).toEqual([]);
  });
});
