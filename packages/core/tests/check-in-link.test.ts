import { describe, expect, it } from "vitest";
import { parseCheckInLink } from "../src/check-in-link";

describe("parseCheckInLink", () => {
  it("reads the screen link", () => {
    expect(parseCheckInLink("https://absqir.example/a/abc-123?t=one.two.three")).toEqual({
      sessionId: "abc-123",
      token: "one.two.three",
    });
  });

  it("accepts a bare path", () => {
    expect(parseCheckInLink("/a/abc?t=tok")).toEqual({ sessionId: "abc", token: "tok" });
  });

  it("rejects a pass, a link without a token, and noise", () => {
    expect(parseCheckInLink("pass.abc.def")).toBeNull();
    expect(parseCheckInLink("https://absqir.example/a/abc")).toBeNull();
    expect(parseCheckInLink("https://absqir.example/sessions/abc?t=x")).toBeNull();
    expect(parseCheckInLink("")).toBeNull();
  });
});
