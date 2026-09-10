import { describe, expect, it } from "vitest";
import { nextSteps } from "#src/lib/next-steps";

describe("nextSteps", () => {
  it("sends the operator to the address when mail works", () => {
    const note = nextSteps({ appUrl: "https://absensi.example.com", mailKeySet: true });

    expect(note.lines[0]).toBe("Open https://absensi.example.com and enter your email address.");
    expect(note.lines.join("\n")).toContain("first account");
    expect(note.lines.join("\n")).not.toContain("admin create");
  });

  it("offers the password route when mail is off", () => {
    const note = nextSteps({ appUrl: "http://localhost:4321", mailKeySet: false });
    const text = note.lines.join("\n");

    expect(text).toContain("RESEND_API_KEY is empty");
    expect(text).toContain("absqir admin create");
    expect(text).toContain("open http://localhost:4321 and sign in");
  });
});
