import type { Fix } from "@absqir/core/geo";
import { match, P } from "ts-pattern";

/**
 * Collects what the device says about where it is.
 *
 * A single `getCurrentPosition` call is the weakest thing a page can ask for.
 * A burst over a few seconds is barely more work and says far more: a real
 * receiver wanders a few metres between readings, carries an altitude, and
 * reports a ragged error bar, while a mock provider repeats one coordinate
 * with a round accuracy and no altitude at all.
 *
 * None of this is proof, and none of it is meant to be. The server scores it;
 * see @absqir/core/location-risk for what the signals are worth and why they
 * flag rather than refuse.
 */

export interface LocationClaim {
  fixes: Fix[];
  nativeGeolocation: boolean;
  automated: boolean;
  timezoneOffsetMinutes: number | null;
  timezone: string | null;
}

export type LocationFaultKind = "refused" | "unsupported" | "insecure" | "unavailable" | "timeout";

export interface LocationFault {
  kind: LocationFaultKind;
  /** The cause and the way out, in one sentence for the reader. */
  message: string;
}

/** How long the burst runs. Long enough to see a receiver wander, short
 * enough that nobody standing at a door gives up waiting. */
const BURST_MS = 4000;
/** The burst stops early once it has this many readings. */
const ENOUGH_FIXES = 6;
/** A hard ceiling, so a device that never answers cannot hang the check-in. */
const TIMEOUT_MS = 12_000;

function faultFor(error: GeolocationPositionError): LocationFault {
  return match(error.code)
    .with(error.PERMISSION_DENIED, () => ({
      kind: "refused" as const,
      message: "Location was refused. Allow it for this site, then try again.",
    }))
    .with(error.POSITION_UNAVAILABLE, () => ({
      kind: "unavailable" as const,
      message: "Your device could not find where it is. Step outside, then try again.",
    }))
    .otherwise(() => ({
      kind: "timeout" as const,
      message: "Your device took too long to find where it is. Try again.",
    }));
}

/**
 * True while `getCurrentPosition` is still the browser's own function.
 *
 * This catches an extension or a script that replaced the API, and nothing
 * else. A fake-GPS app on Android writes the system mock provider, and an
 * override through the developer-tools protocol sits below the page
 * entirely. Both leave this reading perfectly native. The check is cheap and
 * worth twenty points, and it is honest about catching only the crudest try.
 */
function looksNative(): boolean {
  if (typeof navigator === "undefined" || !navigator.geolocation) return false;

  return match(Function.prototype.toString.call(navigator.geolocation.getCurrentPosition))
    .with(P.string.includes("[native code]"), () => true)
    .otherwise(() => false);
}

function toFix(position: GeolocationPosition): Fix {
  const { coords } = position;

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    altitudeAccuracy: coords.altitudeAccuracy,
    speed: coords.speed,
    heading: coords.heading,
    at: position.timestamp,
  };
}

function environment() {
  return {
    nativeGeolocation: looksNative(),
    automated: navigator.webdriver === true,
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    timezone: match(Intl.DateTimeFormat().resolvedOptions().timeZone)
      .with(P.string.minLength(1), (zone) => zone)
      .otherwise(() => null),
  };
}

export class LocationRefused extends Error {
  readonly fault: LocationFault;

  constructor(fault: LocationFault) {
    super(fault.message);
    this.name = "LocationRefused";
    this.fault = fault;
  }
}

/**
 * Watches for a few seconds and hands back every reading. Resolves as soon as
 * the burst is long enough, and rejects with a LocationRefused when the
 * device gives nothing at all.
 */
export function collectLocationClaim(): Promise<LocationClaim> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(
      new LocationRefused({
        kind: "unsupported",
        message: "This browser cannot report where it is. Ask the organizer to check you in.",
      }),
    );
  }

  if (!window.isSecureContext) {
    return Promise.reject(
      new LocationRefused({
        kind: "insecure",
        message: "Location needs an https address.",
      }),
    );
  }

  return new Promise<LocationClaim>((resolve, reject) => {
    const fixes: Fix[] = [];
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watch);
      clearTimeout(burst);
      clearTimeout(ceiling);

      // A burst that ran its course with nothing in it means the device
      // answered neither way, which the reader must be told about plainly.
      match(fixes.length)
        .with(0, () =>
          reject(
            new LocationRefused({
              kind: "timeout",
              message: "Your device took too long to find where it is. Try again.",
            }),
          ),
        )
        .otherwise(() => resolve({ fixes, ...environment() }));
    };

    const watch = navigator.geolocation.watchPosition(
      (position) => {
        fixes.push(toFix(position));
        if (fixes.length >= ENOUGH_FIXES) finish();
      },
      (error) => {
        if (settled) return;
        // A reading already in hand beats the error that ended the watch.
        if (fixes.length > 0) {
          finish();
          return;
        }

        settled = true;
        navigator.geolocation.clearWatch(watch);
        clearTimeout(burst);
        clearTimeout(ceiling);
        reject(new LocationRefused(faultFor(error)));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: TIMEOUT_MS },
    );

    const burst = setTimeout(finish, BURST_MS);
    const ceiling = setTimeout(finish, TIMEOUT_MS);
  });
}

/**
 * How long the door scanner reuses one reading. The organizer's phone stays
 * at the door, so a reading a minute or two old still describes it, and
 * nobody in the queue waits through a fresh burst.
 */
const CACHE_MS = 120_000;

let cached: { at: number; claim: LocationClaim } | null = null;

/**
 * A reading for the organizer's scanner, taken once and reused.
 *
 * Every person admitted through one device therefore carries the same
 * coordinates. That is honest rather than a flaw: they really were all
 * scanned at one spot. The server knows this reading came from a scanner and
 * switches off the checks that compare people to each other.
 */
export async function cachedLocationClaim(): Promise<LocationClaim> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.claim;

  const claim = await collectLocationClaim();
  cached = { at: now, claim };

  return claim;
}

/** Drops the cache, so the next scan takes a fresh reading. */
export function forgetLocationClaim(): void {
  cached = null;
}
