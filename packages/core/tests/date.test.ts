import { afterEach, describe, expect, it } from "vitest";
import { displayTimezone, formatDate, formatRange, setDisplayTimezoneResolver } from "@/date";

const noon = new Date("2026-09-09T12:00:00Z");

afterEach(() => {
  setDisplayTimezoneResolver(() => null);
});

describe("formatDate", () => {
  it("reads the clock in the display zone", () => {
    setDisplayTimezoneResolver(() => "Asia/Jakarta");
    expect(formatDate(noon, "time")).toBe("19:00");

    setDisplayTimezoneResolver(() => "America/New_York");
    expect(formatDate(noon, "time")).toBe("08:00");
  });

  it("moves the date across midnight with the zone", () => {
    const late = new Date("2026-09-09T20:00:00Z");

    setDisplayTimezoneResolver(() => "Asia/Tokyo");
    expect(formatDate(late, "iso")).toBe("2026-09-10");
  });

  it("reports the zone it uses", () => {
    expect(displayTimezone()).toBeNull();

    setDisplayTimezoneResolver(() => "Europe/Paris");
    expect(displayTimezone()).toBe("Europe/Paris");
  });
});

describe("formatRange", () => {
  it("decides same-day in the display zone", () => {
    const end = new Date("2026-09-09T18:00:00Z");

    setDisplayTimezoneResolver(() => "UTC");
    expect(formatRange(noon, end)).toBe("Wed 9 Sep, 12:00 to 18:00");

    // 12:00Z is Wednesday 21:00 in Tokyo, 18:00Z is Thursday 03:00.
    setDisplayTimezoneResolver(() => "Asia/Tokyo");
    expect(formatRange(noon, end)).toBe("Wed 9 Sep, 21:00 to Thu 10 Sep, 03:00");
  });
});
