import { translatorFor } from "@absqir/i18n";
import { afterEach, describe, expect, it } from "vitest";
import { setDisplayLocaleResolver } from "#src/date";
import { notificationBody, notificationTitle } from "#src/notification-text";

afterEach(() => {
  setDisplayLocaleResolver(() => "en");
});

const reminder = {
  title: "Morning standup starts within the hour",
  body: "Mon 14 Sep, 01:15 to 03:00 (Asia/Jakarta).",
  titleKey: "email:notify.reminderHour",
  titleParams: { event: "Morning standup" },
  bodyKey: "email:notify.when",
  bodyParams: {
    startsAt: "2026-09-13T18:15:00.000Z",
    endsAt: "2026-09-13T20:00:00.000Z",
    timezone: "Asia/Jakarta",
  },
};

describe("notificationTitle", () => {
  it("reads in the language asked for, whatever the row was written in", () => {
    expect(notificationTitle(translatorFor("id"), reminder)).toBe(
      "Morning standup mulai dalam satu jam",
    );
    expect(notificationTitle(translatorFor("en"), reminder)).toBe(
      "Morning standup starts within the hour",
    );
  });

  it("falls back to the stored words for a row written before the keys", () => {
    const old = { ...reminder, titleKey: null, titleParams: null };

    expect(notificationTitle(translatorFor("id"), old)).toBe(
      "Morning standup starts within the hour",
    );
  });

  it("ignores a key absqir does not write", () => {
    const odd = { ...reminder, titleKey: "email:notify.whatever" };

    expect(notificationTitle(translatorFor("id"), odd)).toBe(reminder.title);
  });
});

describe("notificationBody", () => {
  it("names the month and the zone as the reader reads them", () => {
    setDisplayLocaleResolver(() => "id");
    const line = notificationBody(translatorFor("id"), reminder);

    expect(line).toContain("Sen 14 Sep");
    expect(line).toContain("(Asia/Jakarta)");
    expect(line).toContain("sampai");
  });

  it("reads the times in the zone the reader chose", () => {
    const line = notificationBody(translatorFor("en"), reminder, { timezone: "UTC" });

    expect(line).toContain("18:15");
    expect(line).toContain("(UTC)");
  });

  it("leaves somebody's own words alone", () => {
    const note = { ...reminder, bodyKey: null, bodyParams: null, body: "I am at the hospital." };

    expect(notificationBody(translatorFor("id"), note)).toBe("I am at the hospital.");
  });
});
