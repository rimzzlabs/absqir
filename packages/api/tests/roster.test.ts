import { describe, expect, it } from "vitest";
import { buildRoster, ROSTER_LIMIT } from "#src/lib/roster";

/** Names in sorted order, as the query hands them over. */
function people(count: number, prefix = "p") {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index).padStart(4, "0")}`,
    name: `${prefix} ${String(index).padStart(4, "0")}`,
  }));
}

describe("buildRoster", () => {
  it("keeps every name of a small event", () => {
    const expected = people(3);

    const roster = buildRoster({ expected, meId: "p-0001", checkedIn: [] });

    expect(roster.attendees).toEqual(expected);
    expect(roster.expectedTotal).toBe(3);
  });

  it("counts everyone expected, even the names past the cap", () => {
    const roster = buildRoster({ expected: people(250), meId: "p-0000", checkedIn: [] });

    expect(roster.attendees).toHaveLength(ROSTER_LIMIT);
    expect(roster.expectedTotal).toBe(250);
  });

  it("keeps my own name when it sorts past the cap", () => {
    const expected = people(250);

    const roster = buildRoster({ expected, meId: "p-0249", checkedIn: [] });

    expect(roster.attendees).toHaveLength(ROSTER_LIMIT);
    expect(roster.attendees.at(-1)?.id).toBe("p-0249");
    expect(roster.attendees[0]?.id).toBe("p-0000");
  });

  it("leaves a capped list in name order", () => {
    const roster = buildRoster({ expected: people(250), meId: "p-0200", checkedIn: [] });
    const names = roster.attendees.map((row) => row.name);

    expect(names).toEqual([...names].sort());
  });

  it("counts a check-in from somebody expected", () => {
    const roster = buildRoster({
      expected: people(4),
      meId: "p-0000",
      checkedIn: ["p-0000", "p-0002"],
    });

    expect(roster.checkedInCount).toBe(2);
  });

  it("leaves a walk-in nobody expected out of the head count", () => {
    const roster = buildRoster({
      expected: people(4),
      meId: "p-0000",
      checkedIn: ["p-0000", "stranger"],
    });

    expect(roster.checkedInCount).toBe(1);
    expect(roster.checkedInCount).toBeLessThanOrEqual(roster.expectedTotal);
  });

  it("never hands out an email or an identifier", () => {
    const roster = buildRoster({
      expected: [{ id: "p-1", name: "Ada Lovelace" }],
      meId: "p-1",
      checkedIn: [],
    });

    expect(Object.keys(roster.attendees[0] ?? {})).toEqual(["id", "name"]);
  });
});
