import { describe, expect, it } from "vitest";
import { isSlug, toSlug, toSlugDraft } from "../src/slug";

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

describe("isSlug", () => {
  it("accepts a finished slug", () => {
    expect(isSlug("acme")).toBe(true);
    expect(isSlug("acme-corp")).toBe(true);
    expect(isSlug("a1")).toBe(true);
  });

  it("refuses a slug that is too short", () => {
    expect(isSlug("a")).toBe(false);
    expect(isSlug("")).toBe(false);
  });

  it("refuses a hyphen at either end", () => {
    expect(isSlug("-acme")).toBe(false);
    expect(isSlug("acme-")).toBe(false);
  });

  it("refuses a character the address bar cannot carry", () => {
    expect(isSlug("Acme")).toBe(false);
    expect(isSlug("acme corp")).toBe(false);
    expect(isSlug("acme_corp")).toBe(false);
  });

  it("refuses a slug over forty characters", () => {
    expect(isSlug("a".repeat(40))).toBe(true);
    expect(isSlug("a".repeat(41))).toBe(false);
  });
});

describe("toSlug", () => {
  it("builds a slug from a name", () => {
    expect(toSlug("Acme Corp")).toBe("acme-corp");
  });

  it("drops the accent and the symbol", () => {
    expect(toSlug("Café & Co")).toBe("cafe-co");
  });

  it("leaves no hyphen at either end", () => {
    expect(toSlug("  Acme  ")).toBe("acme");
    expect(toSlug("Acme -")).toBe("acme");
  });

  it("cuts a long name to forty characters", () => {
    expect(toSlug("a".repeat(60))).toHaveLength(40);
  });

  it("agrees with isSlug on a name long enough to carry one", () => {
    expect(isSlug(toSlug("Acme Corp"))).toBe(true);
  });
});
