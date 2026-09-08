import { formatDate, parseDisplayDay } from "@absqir/core/date";
import { createParser } from "nuqs";

/**
 * A calendar day in the reader's display zone, as `2026-09-09` in the URL.
 * nuqs's own ISO date parser reads UTC midnight, which is the day before
 * for anyone west of Greenwich.
 */
export const parseAsLocalDate = createParser<Date>({
  parse: parseDisplayDay,
  serialize: (date) => formatDate(date, "iso"),
  eq: (a, b) => a.getTime() === b.getTime(),
});
