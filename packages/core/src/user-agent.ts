export interface DeviceDescription {
  browser: string;
  platform: string;
}

/**
 * A short human line for a signed-in device. Vendors lie in their user
 * agent strings on purpose, so the order of the checks matters: Edge and
 * Opera claim Chrome, and everything claims Safari.
 */
export function describeUserAgent(userAgent: string | null | undefined): DeviceDescription {
  const ua = userAgent ?? "";

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\/|FxiOS\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Unknown browser";

  const platform = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Macintosh|Mac OS X/.test(ua)
            ? "macOS"
            : /CrOS/.test(ua)
              ? "ChromeOS"
              : /Linux/.test(ua)
                ? "Linux"
                : "unknown device";

  return { browser, platform };
}

export function deviceLabel(userAgent: string | null | undefined): string {
  const { browser, platform } = describeUserAgent(userAgent);
  return `${browser} on ${platform}`;
}
