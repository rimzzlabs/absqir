import { describe, expect, it } from "vitest";
import { fenceOf } from "#src/lib/location-check";
import { readNetwork, UNKNOWN_NETWORK } from "#src/lib/network";

/**
 * Only the pure halves are covered here. `checkLocation` reads the database
 * for the movement and crowd checks, and this package has no database
 * harness, so the rule it applies lives in @absqir/core/location-risk where
 * it is tested against fixtures.
 */

const full = { requireLocation: true, latitude: -6.2, longitude: 106.8, radiusMeters: 150 };

describe("fenceOf", () => {
  it("builds a circle from a complete opted-in event", () => {
    expect(fenceOf(full)).toEqual({ latitude: -6.2, longitude: 106.8, radiusMeters: 150 });
  });

  it("finds no fence when the organizer never opted in", () => {
    expect(fenceOf({ ...full, requireLocation: false })).toBeNull();
  });

  it("finds no fence when a coordinate is missing", () => {
    expect(fenceOf({ ...full, latitude: null })).toBeNull();
    expect(fenceOf({ ...full, longitude: null })).toBeNull();
    expect(fenceOf({ ...full, radiusMeters: null })).toBeNull();
  });

  it("accepts the null island, which is a real place on the equator", () => {
    expect(fenceOf({ ...full, latitude: 0, longitude: 0 })).not.toBeNull();
  });
});

function withCf(cf: unknown): Request {
  return Object.assign(new Request("https://absqir.test/api/events/x/check-in"), { cf });
}

describe("readNetwork", () => {
  it("says it cannot tell when the runtime is not Cloudflare", () => {
    expect(readNetwork(new Request("https://absqir.test/"))).toEqual(UNKNOWN_NETWORK);
  });

  it("reads the position Cloudflare put on the request", () => {
    const reading = readNetwork(
      withCf({ latitude: "-6.21", longitude: "106.85", asn: 17974, asOrganization: "Telkomsel" }),
    );

    expect(reading.position).toEqual({ latitude: -6.21, longitude: 106.85 });
    expect(reading.asn).toBe(17974);
    expect(reading.relay).toBe(false);
  });

  it("finds no position when Cloudflare sent no coordinates", () => {
    expect(readNetwork(withCf({ asn: 17974, asOrganization: "Telkomsel" })).position).toBeNull();
  });

  it("finds no position when a coordinate is not a number", () => {
    expect(readNetwork(withCf({ latitude: "north", longitude: "106.85" })).position).toBeNull();
  });

  it("marks a network that sells exits", () => {
    expect(readNetwork(withCf({ asOrganization: "DigitalOcean, LLC" })).relay).toBe(true);
    expect(readNetwork(withCf({ asOrganization: "M247 Europe SRL" })).relay).toBe(true);
  });

  it("leaves a carrier and an office alone", () => {
    expect(readNetwork(withCf({ asOrganization: "PT Telkom Indonesia" })).relay).toBe(false);
  });

  it("says it cannot tell when there is no network name to judge", () => {
    expect(readNetwork(withCf({ latitude: "-6.21", longitude: "106.85" })).relay).toBeNull();
  });
});
