import { A } from "@mobily/ts-belt";
import { match } from "ts-pattern";
import { describe, expect, it } from "vitest";
import { translatorFor } from "#src/index";
import { LOCALES } from "#src/locales";
import { messages } from "#src/messages/index";

/** Every key, as "namespace:a.b.c", so two catalogs can be compared. */
function keysOf(value: unknown, prefix: string): string[] {
  if (typeof value !== "object" || value === null) return [prefix];

  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(
      child,
      match(prefix.length)
        .with(0, () => key)
        .otherwise(() => `${prefix}.${key}`),
    ),
  );
}

describe("the catalogs", () => {
  it("say the same things in every language", () => {
    const english = keysOf(messages.en, "");

    for (const locale of A.reject(LOCALES, (locale) => locale === "en")) {
      expect(keysOf(messages[locale], "")).toEqual(english);
    }
  });

  it("read a message back in the language asked for", () => {
    expect(translatorFor("en")("common:actions.save")).toBe("Save");
    expect(translatorFor("id")("common:actions.save")).toBe("Simpan");
  });

  it("counts people in the reader's language", () => {
    expect(translatorFor("en")("common:people", { count: 1 })).toBe("1 person");
    expect(translatorFor("en")("common:people", { count: 4 })).toBe("4 people");
    expect(translatorFor("id")("common:people", { count: 4 })).toBe("4 orang");
  });
});
