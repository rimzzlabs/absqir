import { A, type O } from "@mobily/ts-belt";

/** The shape of the device, for an icon. */
export type DeviceKind = "phone" | "tablet" | "desktop";

export interface DeviceDescription {
  /** The brand name, or null when the string names none this list knows. */
  browser: string | null;
  /** The platform brand name, or null for the same reason. */
  platform: string | null;
  kind: DeviceKind;
}

/** One test in an ordered list. The first pattern that matches wins. */
interface UserAgentRule<T> {
  pattern: RegExp;
  value: T;
}

/**
 * Vendors lie in their user agent strings on purpose, so the order of these
 * lists matters: Edge and Opera both claim Chrome, and almost everything
 * claims Safari.
 */
const BROWSERS: UserAgentRule<string>[] = [
  { pattern: /Edg\//, value: "Edge" },
  { pattern: /OPR\//, value: "Opera" },
  { pattern: /Firefox\/|FxiOS\//, value: "Firefox" },
  { pattern: /Chrome\/|CriOS\//, value: "Chrome" },
  { pattern: /Safari\//, value: "Safari" },
];

const PLATFORMS: UserAgentRule<string>[] = [
  { pattern: /iPhone/, value: "iPhone" },
  { pattern: /iPad/, value: "iPad" },
  { pattern: /Android/, value: "Android" },
  { pattern: /Windows/, value: "Windows" },
  { pattern: /Macintosh|Mac OS X/, value: "macOS" },
  { pattern: /CrOS/, value: "ChromeOS" },
  { pattern: /Linux/, value: "Linux" },
];

const KINDS: UserAgentRule<DeviceKind>[] = [
  { pattern: /iPhone|Android.*Mobile/, value: "phone" },
  { pattern: /iPad|Android/, value: "tablet" },
];

function firstMatch<T>(ua: string, rules: UserAgentRule<T>[]): O.Option<T> {
  return A.getBy(rules, (rule) => rule.pattern.test(ua))?.value;
}

/**
 * What a signed-in device is, in brand names. A name absent from the lists
 * comes back as null: the words around a device are written where the
 * reader's language is known, not here.
 */
export function describeUserAgent(userAgent: string | null | undefined): DeviceDescription {
  const ua = userAgent ?? "";

  return {
    browser: firstMatch(ua, BROWSERS) ?? null,
    platform: firstMatch(ua, PLATFORMS) ?? null,
    kind: firstMatch(ua, KINDS) ?? "desktop",
  };
}
