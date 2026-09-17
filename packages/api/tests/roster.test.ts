import { describe, expect, it } from "vitest";
import { buildRoster } from "#src/lib/roster";

/** Names in sorted order, as the query hands them over. */
function people(count: number, prefix = "p") {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index).padStart(4, "0")}`,
    name: `${prefix} ${String(index).padStart(4, "0")}`,
  }));
}

describe("buildRoster", () => {
  it("counts everyone expected", () => {
    expect(buildRoster({ expected: people(3), checkedIn: [] }).expectedTotal).toBe(3);
    expect(buildRoster({ expected: people(250), checkedIn: [] }).expectedTotal).toBe(250);
  });

  it("counts a check-in from somebody expected", () => {
    const roster = buildRoster({
      expected: people(4),
      checkedIn: ["p-0000", "p-0002"],
    });

    expect(roster.checkedInCount).toBe(2);
  });

  it("leaves a walk-in nobody expected out of the head count", () => {
    const roster = buildRoster({
      expected: people(4),
      checkedIn: ["p-0000", "stranger"],
    });

    expect(roster.checkedInCount).toBe(1);
    expect(roster.checkedInCount).toBeLessThanOrEqual(roster.expectedTotal);
  });

  it("hands out two numbers and no names at all", () => {
    const roster = buildRoster({
      expected: [{ id: "p-1", name: "Ada Lovelace" }],
      checkedIn: [],
    });

    expect(Object.keys(roster)).toEqual(["expectedTotal", "checkedInCount"]);
  });
});
