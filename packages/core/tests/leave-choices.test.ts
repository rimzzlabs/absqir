import { describe, expect, it } from "vitest";
import { askableEvents, isAskable } from "#src/leave-choices";

const scheduled = { id: "e1", status: "scheduled", record: null };
const running = { id: "e2", status: "running", record: null };
const done = { id: "e3", status: "done", record: null };
const recorded = { id: "e4", status: "running", record: { status: "present" } };

describe("isAskable", () => {
  it("offers an event that has not happened and holds no record", () => {
    expect(isAskable(scheduled, new Set())).toBe(true);
  });

  it("offers an event that is running, because leave can still be asked", () => {
    expect(isAskable(running, new Set())).toBe(true);
  });

  it("refuses an event that is over", () => {
    expect(isAskable(done, new Set())).toBe(false);
  });

  it("refuses an event the member already has a record on", () => {
    expect(isAskable(recorded, new Set())).toBe(false);
  });

  it("refuses an event already asked about", () => {
    expect(isAskable(scheduled, new Set(["e1"]))).toBe(false);
  });
});

describe("askableEvents", () => {
  it("keeps only what all three rules allow, in the order given", () => {
    const rows = askableEvents([scheduled, running, done, recorded], ["e2"]);

    expect(rows.map((row) => row.id)).toEqual(["e1"]);
  });

  it("offers everything when nothing was asked and nothing happened", () => {
    expect(askableEvents([scheduled, running], []).length).toBe(2);
  });

  it("offers nothing from an empty list", () => {
    expect(askableEvents([], ["e1"])).toEqual([]);
  });
});
