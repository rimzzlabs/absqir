import { describe, expect, it } from "vitest";
import { envTemplate, pendingProviderSteps } from "#src/lib/templates";

const BASE = {
  secret: "s".repeat(32),
  dbPassword: "p".repeat(16),
  resendKey: "",
  emailFrom: "absqir <onboarding@resend.dev>",
  registrationOpen: false,
};

describe("envTemplate", () => {
  it("writes the address the operator gave", () => {
    const env = envTemplate({ ...BASE, appUrl: "https://absensi.example.com", providers: [] });

    expect(env).toContain('APP_URL="https://absensi.example.com"');
  });

  it("turns on secure cookies for an https address", () => {
    const secure = envTemplate({ ...BASE, appUrl: "https://absensi.example.com", providers: [] });
    const plain = envTemplate({ ...BASE, appUrl: "http://localhost:4321", providers: [] });

    expect(secure).toContain('SECURE_COOKIES="true"');
    expect(plain).toContain('SECURE_COOKIES="false"');
  });

  it("writes the sign-up door the operator picked", () => {
    const invite = envTemplate({ ...BASE, appUrl: "http://localhost:4321", providers: [] });
    const open = envTemplate({
      ...BASE,
      registrationOpen: true,
      appUrl: "http://localhost:4321",
      providers: [],
    });

    expect(invite).toContain('REGISTRATION_OPEN="false"');
    expect(open).toContain('REGISTRATION_OPEN="true"');
  });

  it("keeps the From address it was given", () => {
    const env = envTemplate({
      ...BASE,
      emailFrom: "absqir <hello@absensi.example.com>",
      appUrl: "https://absensi.example.com",
      providers: [],
    });

    expect(env).toContain('EMAIL_FROM="absqir <hello@absensi.example.com>"');
  });

  it("keeps the Resend key it was given", () => {
    const env = envTemplate({
      ...BASE,
      resendKey: "re_test_123",
      appUrl: "http://localhost:4321",
      providers: [],
    });

    expect(env).toContain('RESEND_API_KEY="re_test_123"');
  });

  it("writes the keys the operator typed", () => {
    const env = envTemplate({
      ...BASE,
      appUrl: "https://absensi.example.com",
      providers: [{ id: "github", clientId: "Ov23liABC", clientSecret: "8f2c9d" }],
    });

    expect(env).toContain('GITHUB_CLIENT_ID="Ov23liABC"');
    expect(env).toContain('GITHUB_CLIENT_SECRET="8f2c9d"');
  });

  it("leaves a picked provider live with empty keys and comments out the rest", () => {
    const env = envTemplate({
      ...BASE,
      appUrl: "http://localhost:4321",
      providers: [{ id: "github", clientId: "", clientSecret: "" }],
    });

    expect(env).toContain('GITHUB_CLIENT_ID=""');
    expect(env).toContain('# GOOGLE_CLIENT_ID=""');
  });

  it("prints the callback against the address the operator gave", () => {
    const env = envTemplate({
      ...BASE,
      appUrl: "https://absensi.example.com",
      providers: [{ id: "github", clientId: "", clientSecret: "" }],
    });

    expect(env).toContain("# Callback: https://absensi.example.com/api/auth/callback/github");
  });
});

describe("pendingProviderSteps", () => {
  it("says nothing when no provider was picked", () => {
    expect(pendingProviderSteps({ appUrl: "http://localhost:4321", providers: [] })).toEqual([]);
  });

  it("says nothing for a provider whose keys arrived in the flow", () => {
    const steps = pendingProviderSteps({
      appUrl: "https://absensi.example.com",
      providers: [{ id: "google", clientId: "1234.apps.googleusercontent.com", clientSecret: "x" }],
    });

    expect(steps).toEqual([]);
  });

  it("names the console, the callback, and both keys of an empty pair", () => {
    const steps = pendingProviderSteps({
      appUrl: "https://absensi.example.com",
      providers: [{ id: "google", clientId: "", clientSecret: "" }],
    }).join("\n");

    expect(steps).toContain("https://console.cloud.google.com/apis/credentials");
    expect(steps).toContain("https://absensi.example.com/api/auth/callback/google");
    expect(steps).toContain("GOOGLE_CLIENT_SECRET");
  });
});
