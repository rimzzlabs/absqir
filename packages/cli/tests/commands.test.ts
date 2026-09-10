import { describe, expect, it } from "vitest";
import { COMMANDS, usageOf } from "#src/lib/commands";

describe("COMMANDS", () => {
  it("holds one entry per command id", () => {
    const ids = COMMANDS.map((command) => command.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("starts every usage line with the binary name", () => {
    for (const command of COMMANDS) expect(command.usage.startsWith("absqir ")).toBe(true);
  });
});

describe("usageOf", () => {
  it("returns the usage line of a command", () => {
    expect(usageOf("config set")).toBe("Usage: absqir config set <KEY> <value>");
  });
});
