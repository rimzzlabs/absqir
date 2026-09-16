import { afterEach, describe, expect, it } from "vitest";
import {
  displayTimezone,
  formatDate,
  formatRange,
  inDisplayZone,
  millisecondsUntil,
  parseDisplayDay,
  setDisplayLocaleResolver,
  setDisplayTimezoneResolver,
  startOfDay,
} from "#src/date";

const noon = new Date("2026-09-09T12:00:00Z");

afterEach(() => {
  setDisplayTimezoneResolver(() => null);
  setDisplayLocaleResolver(() => "en");
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

describe("parseDisplayDay", () => {
  it("reads midnight in the display zone", () => {
    setDisplayTimezoneResolver(() => "Asia/Tokyo");
    expect(parseDisplayDay("2026-09-09")?.getTime()).toBe(Date.parse("2026-09-08T15:00:00Z"));
    expect(formatDate(parseDisplayDay("2026-09-09") ?? noon, "iso")).toBe("2026-09-09");
  });

  it("rejects what is not a day", () => {
    expect(parseDisplayDay("2026-9-9")).toBeNull();
    expect(parseDisplayDay("2026-13-40")).toBeNull();
    expect(parseDisplayDay("2026-02-30")).toBeNull();
  });
});

describe("inDisplayZone", () => {
  it("keeps the zone through date-fns arithmetic", () => {
    setDisplayTimezoneResolver(() => "America/New_York");
    // 03:00Z on the 9th is still the 8th in New York.
    const start = startOfDay(inDisplayZone(new Date("2026-09-09T03:00:00Z")));

    expect(start.getTime()).toBe(Date.parse("2026-09-08T04:00:00Z"));
    expect(formatDate(start, "iso")).toBe("2026-09-08");
  });
});

describe("millisecondsUntil", () => {
  const now = new Date("2026-09-09T12:00:00Z");

  it("counts the milliseconds left", () => {
    expect(millisecondsUntil(new Date("2026-09-09T12:00:20Z"), now)).toBe(20_000);
  });

  it("answers zero the moment it lands", () => {
    expect(millisecondsUntil(now, now)).toBe(0);
  });

  it("answers zero after it passes, never a negative number", () => {
    expect(millisecondsUntil(new Date("2026-09-09T11:59:55Z"), now)).toBe(0);
  });
});

describe("the display language", () => {
  it("names the month and the weekday in it", () => {
    setDisplayLocaleResolver(() => "id");
    expect(formatDate(noon, "weekdayDate")).toBe("Rab 9 Sep");

    setDisplayLocaleResolver(() => "en");
    expect(formatDate(noon, "weekdayDate")).toBe("Wed 9 Sep");
  });

  it("joins the two ends of a range in it", () => {
    setDisplayLocaleResolver(() => "id");
    expect(formatRange(noon, new Date("2026-09-09T13:00:00Z"))).toContain("sampai");

    setDisplayLocaleResolver(() => "en");
    expect(formatRange(noon, new Date("2026-09-09T13:00:00Z"))).toContain("to");
  });
});
