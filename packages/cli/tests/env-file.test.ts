import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readEnvValue, setEnvValue } from "@/lib/env-file";

function makeEnvFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "absqir-cli-"));
  const path = join(dir, ".env");
  writeFileSync(path, content);
  return path;
}

describe("readEnvValue", () => {
  it("reads a quoted value", () => {
    const path = makeEnvFile('PORT="4321"\nSECURE_COOKIES="false"\n');

    expect(readEnvValue(path, "PORT")).toBe("4321");
    expect(readEnvValue(path, "SECURE_COOKIES")).toBe("false");
  });

  it("returns null for a missing key", () => {
    const path = makeEnvFile('PORT="4321"\n');

    expect(readEnvValue(path, "MISSING")).toBeNull();
  });
});

describe("setEnvValue", () => {
  it("replaces an existing key in place", () => {
    const path = makeEnvFile('# comment\nPORT="4321"\nSECURE_COOKIES="false"\n');

    setEnvValue({ path, key: "PORT", value: "8080" });

    expect(readEnvValue(path, "PORT")).toBe("8080");
    expect(readFileSync(path, "utf8")).toContain("# comment");
    expect(readEnvValue(path, "SECURE_COOKIES")).toBe("false");
  });

  it("appends a key that is not in the file", () => {
    const path = makeEnvFile('PORT="4321"\n');

    setEnvValue({ path, key: "ABSQIR_TAG", value: "v1.2.3" });

    expect(readEnvValue(path, "ABSQIR_TAG")).toBe("v1.2.3");
    expect(readEnvValue(path, "PORT")).toBe("4321");
  });
});
