import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { init } from "#src/commands/init";
import { readEnvValue } from "#src/lib/env-file";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "absqir-init-"));
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("init over an existing instance", () => {
  it("keeps the database password and the auth secret", async () => {
    const envPath = join(dir, ".env");
    writeFileSync(envPath, 'BETTER_AUTH_SECRET="old-secret"\nPOSTGRES_PASSWORD="old-password"\n');
    writeFileSync(join(dir, "docker-compose.yml"), "services: {}\n");

    const code = await init([dir, "--force", "--yes"]);

    expect(code).toBe(0);
    expect(readEnvValue(envPath, "POSTGRES_PASSWORD")).toBe("old-password");
    expect(readEnvValue(envPath, "BETTER_AUTH_SECRET")).toBe("old-secret");
    expect(readFileSync(join(dir, "docker-compose.yml"), "utf8")).toContain(
      "ghcr.io/rimzzlabs/absqir",
    );
  });

  it("generates fresh secrets for a new directory", async () => {
    const code = await init([join(dir, "fresh"), "--yes"]);
    const envPath = join(dir, "fresh", ".env");

    expect(code).toBe(0);
    expect(readEnvValue(envPath, "POSTGRES_PASSWORD")?.length).toBeGreaterThan(10);
    expect(readEnvValue(envPath, "BETTER_AUTH_SECRET")?.length).toBeGreaterThan(30);
  });
});
