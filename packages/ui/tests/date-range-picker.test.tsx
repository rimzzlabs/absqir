import { I18nProvider } from "@absqir/i18n/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "#src/components/ui/date-picker";

function at(iso: string) {
  return new Date(iso);
}

function triggerText(from: Date | null, to: Date | null) {
  render(
    <I18nProvider locale="en">
      <DateRangePicker value={{ from, to }} onChange={vi.fn()} placeholder="Any date" />
    </I18nProvider>,
  );

  return screen.getByRole("button").textContent ?? "";
}

describe("DateRangePicker trigger", () => {
  it("says the placeholder while nothing is chosen", () => {
    expect(triggerText(null, null)).toContain("Any date");
  });

  it("says the month and the year once inside one month", () => {
    const text = triggerText(at("2026-09-01T00:00"), at("2026-09-18T23:59"));

    expect(text).toContain("1 – 18 Sep 2026");
  });

  it("says one day once when both ends are the same whole day", () => {
    const text = triggerText(at("2026-09-15T00:00"), at("2026-09-15T23:59"));

    expect(text).toContain("15 Sep 2026");
    expect(text).not.toContain("–");
  });

  it("keeps the year once across two months of it", () => {
    const text = triggerText(at("2026-09-28T00:00"), at("2026-10-03T23:59"));

    expect(text).toContain("28 Sep – 3 Oct 2026");
  });

  it("says both years across a new year", () => {
    const text = triggerText(at("2026-12-28T00:00"), at("2027-01-03T23:59"));

    expect(text).toContain("28 Dec 2026 – 3 Jan 2027");
  });

  it("leaves the clock off a window of whole days", () => {
    expect(triggerText(at("2026-09-01T00:00"), at("2026-09-18T23:59"))).not.toContain("00:00");
  });

  it("shows the clock once the window is not whole days", () => {
    const text = triggerText(at("2026-09-01T09:00"), at("2026-09-18T17:00"));

    expect(text).toContain("09:00");
    expect(text).toContain("17:00");
  });

  it("reads a start with no end as one side alone", () => {
    expect(triggerText(at("2026-09-01T00:00"), null)).toContain("From 1 Sep 2026");
  });

  it("reads an end with no start as one side alone", () => {
    expect(triggerText(null, at("2026-09-18T23:59"))).toContain("Until 18 Sep 2026");
  });
});
