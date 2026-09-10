import { describe, expect, it } from "vitest";
import { psqlProbeArgs, readPsqlProbe } from "#src/lib/db-check";

describe("psqlProbeArgs", () => {
  it("asks over the network so the password counts", () => {
    const args = psqlProbeArgs("secret");

    expect(args).toContain("PGPASSWORD=secret");
    expect(args.slice(args.indexOf("-h"), args.indexOf("-h") + 2)).toEqual(["-h", "db"]);
  });
});

describe("readPsqlProbe", () => {
  it("reads a clean answer as open", () => {
    expect(readPsqlProbe({ code: 0, output: "1\n" })).toBe("open");
  });

  it("reads the auth failure as refused", () => {
    const output =
      'psql: error: connection to server at "localhost" failed: FATAL:  password authentication failed for user "absqir"\n';

    expect(readPsqlProbe({ code: 2, output })).toBe("refused");
  });

  it("reads a stopped container as not running", () => {
    expect(readPsqlProbe({ code: 1, output: 'service "db" is not running\n' })).toBe("not-running");
    expect(readPsqlProbe({ code: 1, output: "no container found for db\n" })).toBe("not-running");
  });

  it("does not guess on anything else", () => {
    expect(readPsqlProbe({ code: 1, output: "could not connect: timeout\n" })).toBe("unknown");
  });
});
