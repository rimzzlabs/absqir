import { O } from "@mobily/ts-belt";
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
    expect(O.isNone(parseCheckInLink("pass.abc.def"))).toBe(true);
    expect(O.isNone(parseCheckInLink("https://absqir.example/a/abc"))).toBe(true);
    expect(O.isNone(parseCheckInLink("https://absqir.example/sessions/abc?t=x"))).toBe(true);
    expect(O.isNone(parseCheckInLink(""))).toBe(true);
  });
});
