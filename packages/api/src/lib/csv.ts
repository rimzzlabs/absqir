/**
 * A cell starting with = + - @ (or a control character) executes as a
 * formula when the export opens in Excel or Sheets. A leading apostrophe
 * makes the spreadsheet read it as text.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvCell(value: string): string {
  const neutralized = FORMULA_PREFIX.test(value) ? `'${value}` : value;

  return `"${neutralized.replaceAll('"', '""')}"`;
}
