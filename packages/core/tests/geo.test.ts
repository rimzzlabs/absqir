import { describe, expect, it } from "vitest";
import {
  type Circle,
  type Coordinates,
  distanceMeters,
  type Fix,
  impliedSpeedKph,
  isRadius,
  readFence,
  readTrack,
} from "../src/geo";

const office: Circle = { latitude: -6.2, longitude: 106.816666, radiusMeters: 150 };

function fix(over: Partial<Fix> = {}): Fix {
  return {
    latitude: -6.2,
    longitude: 106.816666,
    accuracy: 12,
    altitude: 24.5,
    altitudeAccuracy: 8,
    speed: 0.3,
    heading: null,
    at: 1_700_000_000_000,
    ...over,
  };
}

/**
 * Moves a point north. A degree of latitude is ~110.6 km this near the
 * equator, so the helper is a few metres optimistic. Fixtures only.
 */
function north<T extends Coordinates>(from: T, meters: number): T {
  return { ...from, latitude: from.latitude + meters / 111_320 };
}

describe("distanceMeters", () => {
  it("finds nothing between a point and itself", () => {
    expect(distanceMeters(office, office)).toBe(0);
  });

  it("measures a short hop", () => {
    expect(distanceMeters(office, north(office, 500))).toBeCloseTo(500, -1);
  });

  it("measures across the world", () => {
    const jakarta = { latitude: -6.2, longitude: 106.816666 };
    const london = { latitude: 51.5072, longitude: -0.1276 };

    expect(distanceMeters(jakarta, london) / 1000).toBeCloseTo(11_719, -2);
  });
});

describe("readFence", () => {
  it("calls the centre inside", () => {
    expect(readFence(office, fix()).verdict).toBe("inside");
  });

  it("calls a point within the radius inside, whatever the error bar says", () => {
    expect(readFence(office, { ...north(office, 100), accuracy: 90 }).verdict).toBe("inside");
  });

  it("calls a point the error bar still reaches an edge", () => {
    // 200 m out, 80 m error bar: the reading cannot rule the person out.
    expect(readFence(office, { ...north(office, 200), accuracy: 80 }).verdict).toBe("edge");
  });

  it("refuses a point no error bar can reach", () => {
    expect(readFence(office, { ...north(office, 400), accuracy: 20 }).verdict).toBe("outside");
  });

  it("never lets a vague reading claim more slack than the fence is wide", () => {
    // A 5 km error bar would otherwise swallow every office in the city.
    expect(readFence(office, { ...north(office, 1000), accuracy: 5000 }).verdict).toBe("outside");
  });

  it("reports the distance in whole metres", () => {
    expect(readFence(office, { ...north(office, 300), accuracy: 10 }).distanceMeters).toBe(300);
  });
});

describe("isRadius", () => {
  it("refuses a fence smaller than a phone's error bar", () => {
    expect(isRadius(10)).toBe(false);
  });

  it("refuses a fence wider than a city", () => {
    expect(isRadius(50_000)).toBe(false);
  });

  it("accepts an office-sized fence", () => {
    expect(isRadius(150)).toBe(true);
  });
});

describe("impliedSpeedKph", () => {
  it("finds no speed between two readings at one spot", () => {
    expect(impliedSpeedKph(fix(), fix({ at: 1_700_000_060_000 }))).toBe(0);
  });

  it("reads a walk as a walk", () => {
    const later = { ...north(fix(), 100), at: fix().at + 60_000 };

    expect(impliedSpeedKph(fix(), later)).toBeCloseTo(6, 0);
  });

  it("calls two places at one instant a teleport", () => {
    const elsewhere = { ...north(fix(), 100_000), at: fix().at };

    expect(impliedSpeedKph(fix(), elsewhere)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("readTrack", () => {
  it("finds nothing in an empty burst", () => {
    expect(readTrack([])).toBeNull();
  });

  it("drops a reading with impossible coordinates", () => {
    expect(readTrack([fix({ latitude: 991 })])).toBeNull();
  });

  it("judges the burst on its most accurate reading", () => {
    const report = readTrack([fix({ accuracy: 60 }), fix({ accuracy: 8 }), fix({ accuracy: 30 })]);

    expect(report?.best.accuracy).toBe(8);
    expect(report?.count).toBe(3);
  });

  it("calls a burst that never moved frozen", () => {
    expect(readTrack([fix(), fix({ at: fix().at + 1000 })])?.frozen).toBe(true);
  });

  it("never calls a single reading frozen", () => {
    expect(readTrack([fix()])?.frozen).toBe(false);
  });

  it("does not call ordinary jitter frozen", () => {
    const drifted = { ...north(fix(), 4), at: fix().at + 1000 };

    expect(readTrack([fix(), drifted])?.frozen).toBe(false);
  });

  it("notices a burst that never carried an altitude", () => {
    expect(readTrack([fix({ altitude: null }), fix({ altitude: null })])?.flat).toBe(true);
    expect(readTrack([fix({ altitude: null }), fix()])?.flat).toBe(false);
  });

  it("notices the same round accuracy on every reading", () => {
    expect(readTrack([fix({ accuracy: 10 }), fix({ accuracy: 10 })])?.constantAccuracy).toBe(true);
  });

  it("leaves a real receiver's wobbling accuracy alone", () => {
    expect(readTrack([fix({ accuracy: 10.4 }), fix({ accuracy: 12.1 })])?.constantAccuracy).toBe(
      false,
    );
  });
});
