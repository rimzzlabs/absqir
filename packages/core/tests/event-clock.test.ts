import { describe, expect, it } from "vitest";
import { lateAt, opensAt } from "../src/event-clock";

const startsAt = new Date("2026-09-18T09:00:00.000Z");

describe("opensAt", () => {
  it("counts back from the start", () => {
    expect(opensAt({ startsAt, opensBeforeMinutes: 15 }).toISOString()).toBe(
      "2026-09-18T08:45:00.000Z",
    );
  });

  it("is the start itself when nothing opens early", () => {
    expect(opensAt({ startsAt, opensBeforeMinutes: 0 })).toEqual(startsAt);
  });
});

describe("lateAt", () => {
  it("counts forward from the start", () => {
    expect(lateAt({ startsAt, lateAfterMinutes: 15 }).toISOString()).toBe(
      "2026-09-18T09:15:00.000Z",
    );
  });

  it("is the start itself when nothing is forgiven", () => {
    expect(lateAt({ startsAt, lateAfterMinutes: 0 })).toEqual(startsAt);
  });
});
