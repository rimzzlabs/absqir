import { R } from "@mobily/ts-belt";
import { afterEach, describe, expect, it, vi } from "vitest";
import { txtRecords } from "#src/lib/dns";

function reply(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => body });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("txtRecords", () => {
  it("unquotes one record", async () => {
    vi.stubGlobal(
      "fetch",
      reply({ Status: 0, Answer: [{ type: 16, data: '"absqir-domain-verification=abc"' }] }),
    );

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual(
      R.Ok(["absqir-domain-verification=abc"]),
    );
  });

  it("joins a long record the resolver split", async () => {
    vi.stubGlobal(
      "fetch",
      reply({ Status: 0, Answer: [{ type: 16, data: '"absqir-domain-" "verification=abc"' }] }),
    );

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual(
      R.Ok(["absqir-domain-verification=abc"]),
    );
  });

  it("keeps TXT answers only", async () => {
    vi.stubGlobal(
      "fetch",
      reply({
        Status: 0,
        Answer: [
          { type: 5, data: "other.example.com." },
          { type: 16, data: '"absqir-domain-verification=abc"' },
        ],
      }),
    );

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual(
      R.Ok(["absqir-domain-verification=abc"]),
    );
  });

  it("answers with no records when the host carries none", async () => {
    vi.stubGlobal("fetch", reply({ Status: 0 }));

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual(R.Ok([]));
  });

  it("answers with no records when the host does not exist", async () => {
    vi.stubGlobal("fetch", reply({ Status: 3 }));

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual(R.Ok([]));
  });

  // The old version returned [] for all three, so a caller could not tell a
  // domain with no record from a lookup that never ran.
  it("reports an unreachable resolver instead of an empty answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual(R.Error("unreachable"));
  });

  it("reports a resolver that refuses the query", async () => {
    vi.stubGlobal("fetch", reply({}, false));

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual(R.Error("resolver"));
  });

  it("reports a resolver that answers with a failure code", async () => {
    vi.stubGlobal("fetch", reply({ Status: 2 }));

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual(R.Error("resolver"));
  });
});
