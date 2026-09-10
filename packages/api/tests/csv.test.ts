import { describe, expect, it } from "vitest";
import { csvCell, csvToRecords, parseCsv } from "#src/lib/csv";

describe("csvCell", () => {
  it("quotes every cell and doubles inner quotes", () => {
    expect(csvCell('Ada "Countess" Lovelace')).toBe('"Ada ""Countess"" Lovelace"');
  });

  it("neutralises a formula prefix", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe('"\'=HYPERLINK(1)"');
    expect(csvCell("+1")).toBe('"\'+1"');
    expect(csvCell("-1")).toBe('"\'-1"');
    expect(csvCell("@x")).toBe('"\'@x"');
  });

  it("leaves a plain value alone apart from the quotes", () => {
    expect(csvCell("Ada")).toBe('"Ada"');
  });
});

describe("parseCsv", () => {
  it("splits rows and cells", () => {
    expect(parseCsv("a,b\r\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("honours quotes with commas and doubled quotes inside", () => {
    expect(parseCsv('"Lovelace, Ada","say ""hi"""')).toEqual([["Lovelace, Ada", 'say "hi"']]);
  });

  it("drops empty lines and trims cells", () => {
    expect(parseCsv(" a , b \n\n c , d \n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("csvToRecords", () => {
  it("reads the first row as lowercase column names", () => {
    const table = csvToRecords("Name,Email\nAda,ada@example.com\nGrace,");

    expect(table.header).toEqual(["name", "email"]);
    expect(table.records).toEqual([
      { name: "Ada", email: "ada@example.com" },
      { name: "Grace", email: "" },
    ]);
  });
});
