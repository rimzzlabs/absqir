import { describe, expect, it } from "vitest";
import { csvCell } from "@/lib/csv";

describe("csvCell", () => {
  it("quotes a plain value", () => {
    expect(csvCell("Budi Santoso")).toBe('"Budi Santoso"');
  });

  it("escapes double quotes", () => {
    expect(csvCell('a "b" c')).toBe('"a ""b"" c"');
  });

  it("neutralizes formula prefixes", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe('"\'=HYPERLINK(1)"');
    expect(csvCell("+62812")).toBe('"\'+62812"');
    expect(csvCell("-1")).toBe('"\'-1"');
    expect(csvCell("@sum")).toBe('"\'@sum"');
  });

  it("keeps a formula character inside the value", () => {
    expect(csvCell("a=b")).toBe('"a=b"');
  });
});
