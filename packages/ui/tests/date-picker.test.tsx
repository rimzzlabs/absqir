import { describe, expect, it } from "vitest";
import { normalizeClock } from "#src/components/ui/date-picker";

describe("normalizeClock", () => {
  it("pads what a person types in a hurry", () => {
    expect(normalizeClock("9")).toBe("09:00");
    expect(normalizeClock("930")).toBe("09:30");
    expect(normalizeClock("0915")).toBe("09:15");
    expect(normalizeClock("17:45")).toBe("17:45");
    expect(normalizeClock("1745")).toBe("17:45");
  });

  it("keeps an empty field empty", () => {
    expect(normalizeClock("")).toBe("");
  });

  it("refuses a time that does not exist", () => {
    expect(normalizeClock("2460")).toBeNull();
    expect(normalizeClock("99")).toBeNull();
  });
});
