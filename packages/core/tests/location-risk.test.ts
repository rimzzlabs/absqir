import { describe, expect, it } from "vitest";
import type { Fix } from "../src/geo";
import { readTrack } from "../src/geo";
import { type RiskInput, scoreRisk } from "../src/location-risk";

const JAKARTA = { latitude: -6.2, longitude: 106.816666 };

function fix(over: Partial<Fix> = {}): Fix {
  return {
    ...JAKARTA,
    accuracy: 11.7,
    altitude: 24.5,
    altitudeAccuracy: 8,
    speed: 0.3,
    heading: null,
    at: 1_700_000_000_000,
    ...over,
  };
}

/** A phone outdoors on a real satellite fix, on the right side of the world. */
function honest(over: Partial<RiskInput> = {}): RiskInput {
  return {
    track: readTrack([
      fix(),
      fix({ latitude: -6.20003, accuracy: 9.4, at: 1_700_000_001_500 }),
      fix({ latitude: -6.20005, accuracy: 13.2, at: 1_700_000_003_000 }),
    ]),
    environment: {
      nativeGeolocation: true,
      automated: false,
      // UTC+7, which is where Jakarta's longitude says it should be.
      timezoneOffsetMinutes: -420,
    },
    fence: JAKARTA,
    network: { position: { latitude: -6.17, longitude: 106.82 }, relay: false },
    previous: null,
    peers: [],
    ...over,
  };
}

describe("scoreRisk", () => {
  it("clears an ordinary phone outdoors", () => {
    const report = scoreRisk(honest());

    expect(report.level).toBe("clear");
    expect(report.reasons).toEqual([]);
  });

  it("clears a phone indoors on wifi, which is the common false positive", () => {
    // No altitude, one reading, and a coarse error bar. Every one of these is
    // also true of an honest member in a basement meeting room.
    const report = scoreRisk(honest({ track: readTrack([fix({ altitude: null, accuracy: 48 })]) }));

    expect(report.reasons).toEqual(["no-altitude", "single-fix"]);
    expect(report.level).toBe("clear");
  });

  it("flags a burst that never moved", () => {
    const frozen = readTrack([
      fix({ altitude: null }),
      fix({ altitude: null, at: fix().at + 2000 }),
    ]);
    const report = scoreRisk(honest({ track: frozen }));

    expect(report.reasons).toContain("frozen-track");
    expect(report.level).toBe("suspect");
  });

  it("flags a patched geolocation API on its own", () => {
    const report = scoreRisk(
      honest({
        environment: { nativeGeolocation: false, automated: false, timezoneOffsetMinutes: -420 },
      }),
    );

    expect(report.reasons).toEqual(["patched-api"]);
    expect(report.level).toBe("suspect");
  });

  it("flags an automated browser on its own", () => {
    const report = scoreRisk(
      honest({
        environment: { nativeGeolocation: true, automated: true, timezoneOffsetMinutes: -420 },
      }),
    );

    expect(report.level).toBe("suspect");
  });

  it("flags a jump no aircraft could make", () => {
    const report = scoreRisk(
      honest({ previous: { latitude: 51.5072, longitude: -0.1276, at: fix().at - 600_000 } }),
    );

    expect(report.reasons).toContain("teleport");
    expect(report.level).toBe("suspect");
  });

  it("leaves a walk across the car park alone", () => {
    const report = scoreRisk(
      honest({ previous: { latitude: -6.2015, longitude: 106.816666, at: fix().at - 600_000 } }),
    );

    expect(report.reasons).not.toContain("teleport");
  });

  it("leaves a short hop alone even when the implied speed reads high", () => {
    // 200 m in one second is 720 kph on paper, and means only that two
    // readings landed close together with a ragged clock.
    const report = scoreRisk(
      honest({ previous: { latitude: -6.2018, longitude: 106.816666, at: fix().at - 1000 } }),
    );

    expect(report.reasons).not.toContain("teleport");
  });

  it("flags two people who sent the very same coordinates", () => {
    // The burst is judged on its most accurate reading, so the copy has to
    // match that one, which is what a shared spoof configuration produces.
    const report = scoreRisk(honest({ peers: [{ latitude: -6.20003, longitude: 106.816666 }] }));

    expect(report.reasons).toContain("shared-coordinates");
    expect(report.level).toBe("suspect");
  });

  it("leaves two people in one room alone", () => {
    const report = scoreRisk(honest({ peers: [{ latitude: -6.2001, longitude: 106.8167 }] }));

    expect(report.reasons).not.toContain("shared-coordinates");
  });

  it("flags a network address on the far side of the world", () => {
    const report = scoreRisk(
      honest({ network: { position: { latitude: 50.11, longitude: 8.68 }, relay: false } }),
    );

    expect(report.reasons).toContain("network-far");
  });

  it("says nothing about the network when the runtime cannot tell", () => {
    const report = scoreRisk(honest({ network: { position: null, relay: null } }));

    expect(report.reasons).not.toContain("network-far");
    expect(report.reasons).not.toContain("network-relay");
    expect(report.level).toBe("clear");
  });

  it("flags a device clock that belongs to another part of the world", () => {
    const report = scoreRisk(
      honest({
        // UTC+2 while standing, supposedly, in Jakarta.
        environment: { nativeGeolocation: true, automated: false, timezoneOffsetMinutes: -120 },
      }),
    );

    expect(report.reasons).toContain("timezone-mismatch");
  });

  it("leaves Spain alone, where the clock is furthest from the sun", () => {
    const madrid = { latitude: 40.4168, longitude: -3.7038 };
    const report = scoreRisk(
      honest({
        fence: madrid,
        track: readTrack([fix({ ...madrid }), fix({ ...madrid, latitude: 40.41683 })]),
        network: { position: madrid, relay: false },
        environment: { nativeGeolocation: true, automated: false, timezoneOffsetMinutes: -120 },
      }),
    );

    expect(report.reasons).not.toContain("timezone-mismatch");
  });

  it("flags the tell-tale mock provider reading", () => {
    // One spot, never moving, no altitude, and a perfectly round metre of
    // accuracy on every tick. This is what a fake GPS app hands the browser.
    const mocked = readTrack([
      fix({ accuracy: 1, altitude: null }),
      fix({ accuracy: 1, altitude: null, at: fix().at + 1500 }),
      fix({ accuracy: 1, altitude: null, at: fix().at + 3000 }),
    ]);
    const report = scoreRisk(honest({ track: mocked }));

    expect(report.reasons).toEqual([
      "frozen-track",
      "perfect-accuracy",
      "constant-accuracy",
      "no-altitude",
    ]);
    expect(report.score).toBe(85);
    expect(report.level).toBe("suspect");
  });

  it("never runs past a hundred", () => {
    const report = scoreRisk(
      honest({
        track: readTrack([
          fix({ accuracy: 1, altitude: null }),
          fix({ accuracy: 1, altitude: null }),
        ]),
        environment: { nativeGeolocation: false, automated: true, timezoneOffsetMinutes: -120 },
        network: { position: { latitude: 50.11, longitude: 8.68 }, relay: true },
        previous: { latitude: 51.5072, longitude: -0.1276, at: fix().at - 600_000 },
        peers: [JAKARTA],
      }),
    );

    expect(report.score).toBe(100);
  });

  it("says nothing at all when the device sent no reading", () => {
    const report = scoreRisk(honest({ track: null }));

    expect(report.reasons).toEqual([]);
  });
});
