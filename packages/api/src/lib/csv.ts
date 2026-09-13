import { A } from "@mobily/ts-belt";
import { match } from "ts-pattern";

/**
 * A cell starting with = + - @ (or a control character) executes as a
 * formula when the export opens in Excel or Sheets. A leading apostrophe
 * makes the spreadsheet read it as text.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvCell(value: string): string {
  const neutralized = match(FORMULA_PREFIX.test(value))
    .with(true, () => `'${value}`)
    .otherwise(() => value);

  return `"${neutralized.replaceAll('"', '""')}"`;
}

/**
 * Parses RFC 4180 style CSV: commas, optional double quotes, doubled quotes
 * inside a quoted cell, CRLF or LF line ends. Returns rows of trimmed cells.
 * Empty lines are dropped. Enough for a directory export from a spreadsheet;
 * not a general purpose parser.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (A.some(row, (value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (A.some(row, (value) => value.length > 0)) rows.push(row);

  return rows;
}

export interface CsvTable {
  header: readonly string[];
  records: readonly Record<string, string>[];
}

/** Reads the first row as lowercase column names, the rest as records. */
export function csvToRecords(text: string): CsvTable {
  const [first, ...rest] = parseCsv(text);
  const header = A.map(first ?? [], (name) => name.toLowerCase());

  const records = A.map(rest, (row) =>
    Object.fromEntries(A.mapWithIndex(header, (index, name) => [name, row[index] ?? ""])),
  );

  return { header, records };
}
