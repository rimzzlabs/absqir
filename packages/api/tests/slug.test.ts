import { describe, expect, it } from "vitest";
import { isSlug, toSlug } from "@/lib/slug";

describe("toSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(toSlug("Yayasan Contoh 2026")).toBe("yayasan-contoh-2026");
  });

  it("strips accents and stray symbols", () => {
    expect(toSlug("  Café & Co!  ")).toBe("cafe-co");
  });

  it("caps the length", () => {
    expect(toSlug("a".repeat(60))).toHaveLength(40);
  });
});

describe("isSlug", () => {
  it("accepts lowercase letters, digits, and inner hyphens", () => {
    expect(isSlug("acme-2026")).toBe(true);
    expect(isSlug("ab")).toBe(true);
  });

  it("rejects the rest", () => {
    expect(isSlug("Acme")).toBe(false);
    expect(isSlug("-acme")).toBe(false);
    expect(isSlug("acme-")).toBe(false);
    expect(isSlug("a")).toBe(false);
    expect(isSlug("a".repeat(41))).toBe(false);
  });
});
