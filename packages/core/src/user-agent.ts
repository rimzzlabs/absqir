/** The shape of the device, for an icon. */
export type DeviceKind = "phone" | "tablet" | "desktop";

export interface DeviceDescription {
  browser: string;
  platform: string;
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

function firstMatch<T>(ua: string, rules: UserAgentRule<T>[]): T | undefined {
  return rules.find((rule) => rule.pattern.test(ua))?.value;
}

/** A short human line for a signed-in device. */
export function describeUserAgent(userAgent: string | null | undefined): DeviceDescription {
  const ua = userAgent ?? "";

  return {
    browser: firstMatch(ua, BROWSERS) ?? "Unknown browser",
    platform: firstMatch(ua, PLATFORMS) ?? "unknown device",
    kind: firstMatch(ua, KINDS) ?? "desktop",
  };
}

export function deviceLabel(userAgent: string | null | undefined): string {
  const { browser, platform } = describeUserAgent(userAgent);
  return `${browser} on ${platform}`;
}
