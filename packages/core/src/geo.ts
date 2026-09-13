import { A } from "@mobily/ts-belt";
import { match, P } from "ts-pattern";
import { formatNumber } from "#src/numbers";

/**
 * Circle geometry for the check-in fence. Everything here is pure, so the
 * rule that decides an attendance record can be read and tested without a
 * database, a browser, or a network.
 *
 * A circle is enough. A polygon fence reads better on a map, but it needs
 * PostGIS or a point-in-polygon pass, and an office is a dot with a radius.
 */

/** IUGG mean Earth radius. */
const EARTH_RADIUS_METERS = 6_371_008.8;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** One reading from the device, with everything the browser hands over. */
export interface Fix extends Coordinates {
  /** The radius of the device's own error bar, in metres. */
  accuracy: number;
  /** Metres above the ellipsoid. Null when the fix came from wifi or the IP. */
  altitude: number | null;
  altitudeAccuracy: number | null;
  /** Metres per second. Null when the device cannot tell. */
  speed: number | null;
  heading: number | null;
  /** Epoch milliseconds, as the device reported them. */
  at: number;
}

export interface Circle extends Coordinates {
  radiusMeters: number;
}

/** Below this a fence is smaller than a consumer GNSS error bar. */
export const MIN_RADIUS_METERS = 25;
/** Above this the fence stops meaning "at the place". */
export const MAX_RADIUS_METERS = 20_000;
export const DEFAULT_RADIUS_METERS = 150;

/**
 * A reading coarser than this cannot place anyone. The check-in asks for
 * another try instead of guessing, because a 2 km error bar overlaps every
 * fence in the city.
 */
export const MAX_ACCURACY_METERS = 200;

export function isLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isRadius(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_RADIUS_METERS && value <= MAX_RADIUS_METERS;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance by the haversine formula. Accurate to a few metres
 * over the distances a fence cares about, and it needs no dependency.
 */
export function distanceMeters(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * `inside` is plain. `edge` means the reading sits outside the fence but its
 * own error bar still reaches in, so the device cannot rule the person out.
 * Both count as present. Only `outside` refuses.
 */
export type FenceVerdict = "inside" | "edge" | "outside";

export interface FenceReading {
  verdict: FenceVerdict;
  /** Centre to reading, in whole metres. */
  distanceMeters: number;
}

export function readFence(circle: Circle, fix: Coordinates & { accuracy: number }): FenceReading {
  const distance = distanceMeters(circle, fix);
  // Credit the reading with its error bar, but never more than the fence
  // itself, so a vague fix cannot claim a small office from far away.
  const slack = Math.min(Math.max(fix.accuracy, 0), circle.radiusMeters);

  const verdict = match(distance)
    .when(
      (d) => d <= circle.radiusMeters,
      () => "inside" as const,
    )
    .when(
      (d) => d <= circle.radiusMeters + slack,
      () => "edge" as const,
    )
    .otherwise(() => "outside" as const);

  return { verdict, distanceMeters: Math.round(distance) };
}

/**
 * Kilometres per hour implied by moving from one reading to the next. Two
 * readings at the same instant give Infinity, which the caller reads as a
 * teleport only when the two places differ.
 */
export function impliedSpeedKph(from: Fix | TrackPoint, to: Fix | TrackPoint): number {
  const meters = distanceMeters(from, to);
  const hours = Math.abs(to.at - from.at) / 3_600_000;

  return match(hours)
    .with(0, () =>
      match(meters === 0)
        .with(true, () => 0)
        .otherwise(() => Number.POSITIVE_INFINITY),
    )
    .otherwise(() => meters / 1000 / hours);
}

export interface TrackPoint extends Coordinates {
  at: number;
}

/** What a short burst of readings says about itself. */
export interface TrackReport {
  count: number;
  /** The reading the fence is judged on: the most accurate of the burst. */
  best: Fix;
  /** Largest gap between any reading and the best one, in metres. */
  spreadMeters: number;
  /** No reading moved at all. Real GNSS never repeats a coordinate exactly. */
  frozen: boolean;
  /** Not one reading carried an altitude. */
  flat: boolean;
  /** Every reading claimed the same whole-metre accuracy. */
  constantAccuracy: boolean;
}

const IDENTICAL_METERS = 0.5;

/**
 * Reads a burst of fixes. Sorting by accuracy and judging the fence on the
 * best one is deliberate: a member should not be refused because one ragged
 * reading in the burst landed across the street.
 */
export function readTrack(fixes: readonly Fix[]): TrackReport | null {
  const usable = A.filter(fixes, (fix) => isLatitude(fix.latitude) && isLongitude(fix.longitude));
  const best = A.reduce(usable, null as Fix | null, (carry, fix) =>
    match(carry)
      .with(P.nullish, () => fix)
      .otherwise((current) =>
        match(fix.accuracy < current.accuracy)
          .with(true, () => fix)
          .otherwise(() => current),
      ),
  );

  if (!best) return null;

  const distances = A.map(usable, (fix) => distanceMeters(best, fix));

  return {
    count: usable.length,
    best,
    spreadMeters: Math.round(Math.max(0, ...distances)),
    // One reading proves nothing about movement, so it is never called frozen.
    frozen: usable.length > 1 && A.every(distances, (meters) => meters < IDENTICAL_METERS),
    flat: A.every(usable, (fix) => fix.altitude === null),
    constantAccuracy:
      usable.length > 1 &&
      A.every(usable, (fix) => fix.accuracy === best.accuracy && Number.isInteger(fix.accuracy)),
  };
}

/**
 * A distance as a person reads it. Metres up to a kilometre, then kilometres
 * with one decimal, then whole kilometres once the decimal stops meaning
 * anything. "53800 m away" is technically true and unreadable.
 */
export function formatDistance(meters: number): string {
  const safe = Math.max(0, Math.round(meters));

  return match(safe)
    .when(
      (value) => value < 1000,
      (value) => `${formatNumber(value)} m`,
    )
    .when(
      (value) => value < 100_000,
      (value) =>
        `${formatNumber(value / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`,
    )
    .otherwise((value) => `${formatNumber(Math.round(value / 1000))} km`);
}
