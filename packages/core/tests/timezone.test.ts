import { describe, expect, it } from "vitest";
import { describeTimezone, isTimezone, listTimezones, timezoneOffset } from "#src/timezone";

describe("timezone", () => {
  it("accepts a zone the runtime knows and nothing else", () => {
    expect(isTimezone("Asia/Jakarta")).toBe(true);
    expect(isTimezone("UTC")).toBe(true);
    expect(isTimezone("Mars/Olympus")).toBe(false);
    expect(isTimezone("")).toBe(false);
    expect(isTimezone(7)).toBe(false);
  });

  it("lists zones the validator accepts", () => {
    const zones = listTimezones();

    expect(zones.length).toBeGreaterThan(100);
    expect(zones.every((zone) => isTimezone(zone))).toBe(true);
  });

  it("names the offset at one instant", () => {
    const at = new Date("2026-01-15T12:00:00Z");

    expect(timezoneOffset("Asia/Jakarta", at)).toBe("GMT+7");
    expect(timezoneOffset("America/St_Johns", at)).toBe("GMT-3:30");
    expect(timezoneOffset("UTC", at)).toBe("GMT");
  });

  it("puts the city before the region", () => {
    const at = new Date("2026-01-15T12:00:00Z");

    expect(describeTimezone("Asia/Jakarta", at)).toBe("Jakarta, Asia (GMT+7)");
    expect(describeTimezone("America/Argentina/Buenos_Aires", at)).toBe(
      "Argentina / Buenos Aires, America (GMT-3)",
    );
    expect(describeTimezone("UTC", at)).toBe("UTC (GMT)");
  });
});
