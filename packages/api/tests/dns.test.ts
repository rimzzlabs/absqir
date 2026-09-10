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

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual([
      "absqir-domain-verification=abc",
    ]);
  });

  it("joins a long record the resolver split", async () => {
    vi.stubGlobal(
      "fetch",
      reply({ Status: 0, Answer: [{ type: 16, data: '"absqir-domain-" "verification=abc"' }] }),
    );

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual([
      "absqir-domain-verification=abc",
    ]);
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

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual([
      "absqir-domain-verification=abc",
    ]);
  });

  it("says nothing when the host has no record", async () => {
    vi.stubGlobal("fetch", reply({ Status: 3 }));

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual([]);
  });

  it("says nothing when the resolver fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(txtRecords("_absqir.kolosal.ai")).resolves.toEqual([]);
  });
});
