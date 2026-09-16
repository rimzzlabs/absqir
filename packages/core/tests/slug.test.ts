import { describe, expect, it } from "vitest";
import { toSlugDraft } from "../src/slug";

describe("toSlugDraft", () => {
  it("turns a space into a hyphen", () => {
    expect(toSlugDraft("yayasan contoh")).toBe("yayasan-contoh");
  });

  it("keeps a hyphen the reader types", () => {
    expect(toSlugDraft("acme-corp")).toBe("acme-corp");
  });

  it("keeps a hyphen at the end, because the reader is still typing", () => {
    expect(toSlugDraft("acme-")).toBe("acme-");
  });

  it("opens the slug with neither a space nor a hyphen", () => {
    expect(toSlugDraft(" ")).toBe("");
    expect(toSlugDraft("-")).toBe("");
    expect(toSlugDraft("   acme")).toBe("acme");
    expect(toSlugDraft("---acme")).toBe("acme");
  });

  it("never doubles a hyphen", () => {
    expect(toSlugDraft("acme- ")).toBe("acme-");
    expect(toSlugDraft("acme -")).toBe("acme-");
    expect(toSlugDraft("acme--corp")).toBe("acme-corp");
    expect(toSlugDraft("acme  corp")).toBe("acme-corp");
  });

  it("drops a symbol the slug cannot carry", () => {
    expect(toSlugDraft("acme & co!")).toBe("acme-co");
    expect(toSlugDraft("a_b.c/d")).toBe("abcd");
  });

  it("drops a capital to lower case", () => {
    expect(toSlugDraft("Acme Corp")).toBe("acme-corp");
  });

  it("takes the accent off a letter", () => {
    expect(toSlugDraft("Café Ñandú")).toBe("cafe-nandu");
  });

  it("counts a tab and a newline as a space", () => {
    expect(toSlugDraft("acme\tcorp\nltd")).toBe("acme-corp-ltd");
  });

  it("answers an empty string with an empty string", () => {
    expect(toSlugDraft("")).toBe("");
  });

  it("agrees with a slug that is already clean", () => {
    expect(toSlugDraft("yayasan-contoh-2026")).toBe("yayasan-contoh-2026");
  });
});
