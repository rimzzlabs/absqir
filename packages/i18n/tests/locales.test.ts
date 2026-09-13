import { describe, expect, it } from "vitest";
import { localeFromHeader } from "#src/locales";

describe("localeFromHeader", () => {
  it("takes the language the browser wants most", () => {
    expect(localeFromHeader("id-ID,id;q=0.9,en;q=0.8")).toBe("id");
    expect(localeFromHeader("en-GB,en;q=0.9")).toBe("en");
  });

  it("reads quality, not order", () => {
    expect(localeFromHeader("en;q=0.4,id;q=0.9")).toBe("id");
  });

  it("skips a language absqir does not speak", () => {
    expect(localeFromHeader("fr-FR,fr;q=0.9,id;q=0.5")).toBe("id");
  });

  it("has nothing to say about a header it cannot use", () => {
    expect(localeFromHeader("fr-FR")).toBeNull();
    expect(localeFromHeader("")).toBeNull();
    expect(localeFromHeader(null)).toBeNull();
  });

  it("ignores a language the browser refuses", () => {
    expect(localeFromHeader("id;q=0,en")).toBe("en");
  });
});
