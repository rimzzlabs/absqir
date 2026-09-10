import { A, O, pipe } from "@mobily/ts-belt";
/**
 * IANA time zones, as the browser and Node know them. An account can name
 * one, so two people in different places read the same instant in their own
 * clock. Null means "follow the device".
 */
export function isTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return false;

  // The runtime is the only authority on which zones it knows; an unknown one
  // throws here rather than returning anything to test.
  return O.isSome(O.fromExecution(() => new Intl.DateTimeFormat("en", { timeZone: value })));
}

/** The zone this runtime runs in. UTC when the runtime does not say. */
export function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Every zone the runtime can format in, sorted as the runtime lists them. */
export function listTimezones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

/** "GMT+7", "GMT-3:30", or "GMT" for a zone at one instant. */
export function timezoneOffset(zone: string, at: Date = new Date()): string {
  const offset = pipe(
    A.getBy(
      new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(
        at,
      ),
      (part) => part.type === "timeZoneName",
    ),
    O.mapWithDefault("GMT", (part) => part.value),
  );

  // "GMT+0" and "GMT" both mean no offset; one spelling is enough.
  return offset.replace(/^GMT[+-]0$/, "GMT");
}

/** "Asia/Jakarta" as "Jakarta, Asia (GMT+7)": the city first, because that is what people search. */
export function describeTimezone(zone: string, at: Date = new Date()): string {
  const [region, ...rest] = zone.split("/");
  const city = rest.join(" / ").replaceAll("_", " ");
  const place = city ? `${city}, ${region}` : zone.replaceAll("_", " ");

  return `${place} (${timezoneOffset(zone, at)})`;
}
