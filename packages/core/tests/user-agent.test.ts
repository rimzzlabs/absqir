import { describe, expect, it } from "vitest";
import { describeUserAgent, deviceLabel } from "../src/user-agent";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";
const EDGE_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1";
const FIREFOX_ANDROID = "Mozilla/5.0 (Android 16; Mobile; rv:150.0) Gecko/150.0 Firefox/150.0";
const SAFARI_IPAD =
  "Mozilla/5.0 (iPad; CPU OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 16; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

describe("describeUserAgent", () => {
  it("tells Chrome from the Safari it claims", () => {
    expect(describeUserAgent(CHROME_MAC)).toEqual({
      browser: "Chrome",
      platform: "macOS",
      kind: "desktop",
    });
  });

  it("tells Edge from the Chrome it claims", () => {
    expect(describeUserAgent(EDGE_WIN)).toEqual({
      browser: "Edge",
      platform: "Windows",
      kind: "desktop",
    });
  });

  it("reads phones", () => {
    expect(describeUserAgent(SAFARI_IPHONE)).toEqual({
      browser: "Safari",
      platform: "iPhone",
      kind: "phone",
    });
    expect(describeUserAgent(FIREFOX_ANDROID)).toEqual({
      browser: "Firefox",
      platform: "Android",
      kind: "phone",
    });
  });

  it("tells a tablet from a phone", () => {
    expect(describeUserAgent(SAFARI_IPAD).kind).toBe("tablet");
    expect(describeUserAgent(CHROME_ANDROID_TABLET).kind).toBe("tablet");
  });

  it("copes with nothing", () => {
    expect(deviceLabel(null)).toBe("Unknown browser on unknown device");
  });
});
