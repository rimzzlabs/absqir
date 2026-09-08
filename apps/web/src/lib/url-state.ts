import { createParser } from "nuqs";

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * A calendar day in the reader's own timezone, as `2026-09-09` in the URL.
 * nuqs's own ISO date parser reads UTC midnight, which is the day before
 * for anyone west of Greenwich.
 */
export const parseAsLocalDate = createParser<Date>({
  parse: (value) => {
    const match = LOCAL_DATE.exec(value);
    if (!match) return null;

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  },
  serialize: (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
  eq: (a, b) => a.getTime() === b.getTime(),
});
