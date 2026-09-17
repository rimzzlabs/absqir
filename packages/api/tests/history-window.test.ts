import { describe, expect, it } from "vitest";
import { HISTORY_WINDOWS, historySince } from "#src/lib/history-window";

const NOW = new Date("2026-09-17T08:00:00.000Z");

describe("historySince", () => {
  it("takes in everything for the widest window", () => {
    expect(historySince("any", NOW)).toBeNull();
  });

  it("counts the days back from now", () => {
    expect(historySince("30d", NOW)).toEqual(new Date("2026-08-18T08:00:00.000Z"));
    expect(historySince("90d", NOW)).toEqual(new Date("2026-06-19T08:00:00.000Z"));
    expect(historySince("12m", NOW)).toEqual(new Date("2025-09-17T08:00:00.000Z"));
  });

  it("never reaches forward", () => {
    for (const when of HISTORY_WINDOWS) {
      const since = historySince(when, NOW);
      if (since) expect(since.getTime()).toBeLessThan(NOW.getTime());
    }
  });

  it("widens as the window grows", () => {
    const days30 = historySince("30d", NOW)?.getTime() ?? 0;
    const days90 = historySince("90d", NOW)?.getTime() ?? 0;
    const months12 = historySince("12m", NOW)?.getTime() ?? 0;

    expect(days90).toBeLessThan(days30);
    expect(months12).toBeLessThan(days90);
  });
});
