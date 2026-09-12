import { describe, expect, it } from "vitest";
import { pickSoleOwnerships } from "#src/accounts";

const owned = [
  { id: "org-alone", name: "Alone" },
  { id: "org-shared", name: "Shared" },
];

describe("pickSoleOwnerships", () => {
  it("keeps an organization with one owner and counts the others", () => {
    const found = pickSoleOwnerships({
      owned,
      tallies: [
        { organizationId: "org-alone", members: 1, owners: 1 },
        { organizationId: "org-shared", members: 9, owners: 3 },
      ],
    });

    expect(found).toEqual([{ organizationId: "org-alone", name: "Alone", otherMembers: 0 }]);
  });

  it("reports the members left behind, so the door can refuse", () => {
    const found = pickSoleOwnerships({
      owned,
      tallies: [
        { organizationId: "org-alone", members: 1, owners: 1 },
        { organizationId: "org-shared", members: 12, owners: 1 },
      ],
    });

    expect(found).toEqual([
      { organizationId: "org-alone", name: "Alone", otherMembers: 0 },
      { organizationId: "org-shared", name: "Shared", otherMembers: 11 },
    ]);
  });

  it("drops an organization with no tally rather than guessing", () => {
    const found = pickSoleOwnerships({ owned, tallies: [] });

    expect(found).toEqual([]);
  });
});
