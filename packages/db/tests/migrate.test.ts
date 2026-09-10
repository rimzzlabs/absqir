import { describe, expect, it } from "vitest";
import { describeDatabaseError } from "#src/migrate";

function pgError(code: string): Error {
  return Object.assign(new Error("pg failed"), { code });
}

function wrapped(code: string): Error {
  return new Error("Failed query", { cause: pgError(code) });
}

describe("describeDatabaseError", () => {
  it("names a refused password and does not retry", () => {
    const verdict = describeDatabaseError(wrapped("28P01"));

    expect(verdict.retry).toBe(false);
    expect(verdict.message).toContain("POSTGRES_PASSWORD");
    expect(verdict.message).toContain("docker compose down -v");
  });

  it("names a missing database and does not retry", () => {
    const verdict = describeDatabaseError(pgError("3D000"));

    expect(verdict.retry).toBe(false);
    expect(verdict.message).toContain("does not exist");
  });

  it("retries while Postgres boots", () => {
    for (const code of ["ECONNREFUSED", "57P03", "ENOTFOUND"]) {
      const verdict = describeDatabaseError(wrapped(code));

      expect(verdict.retry).toBe(true);
      expect(verdict.message).toContain("not accepting connections");
    }
  });

  it("finds the code under two layers of wrapping", () => {
    const socket = pgError("ECONNRESET");
    const pool = new Error("pool", { cause: socket });
    const drizzle = new Error("query", { cause: pool });

    expect(describeDatabaseError(drizzle).retry).toBe(true);
  });

  it("retries an unknown error with its first line", () => {
    const verdict = describeDatabaseError(new Error("disk full\nmore detail"));

    expect(verdict).toEqual({ retry: true, message: "disk full" });
  });

  it("copes with a thrown string", () => {
    expect(describeDatabaseError("boom")).toEqual({ retry: true, message: "boom" });
  });
});
