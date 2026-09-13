import { A, pipe } from "@mobily/ts-belt";
import { match, P } from "ts-pattern";
import {
  type Coordinates,
  distanceMeters,
  impliedSpeedKph,
  type TrackPoint,
  type TrackReport,
} from "#src/geo";

/**
 * How much a check-in reading looks like a lie.
 *
 * Read this first, because the shape of the module follows from it: a web
 * page cannot tell a real satellite fix from a fake one. An Android "fake
 * GPS" app writes the system mock provider, and the browser hands the page
 * an ordinary-looking fix with no flag on it, because the web Geolocation
 * API has no `isMock` field. The developer-tools sensor panel and the
 * automation protocols override deeper still, so the function even reads as
 * native code. Only the crudest attack, a browser extension that replaces
 * `navigator.geolocation`, leaves a mark in the page.
 *
 * So nothing here is proof. Each signal is weak on its own and cheap to
 * defeat on its own. Together, and repeated across every event a person
 * attends, they leave a pattern that is tiring to fake. The fence itself is
 * never the only gate: the rotating code on the room screen already proves
 * the reader saw the live screen, and that is the real anchor.
 *
 * The score therefore flags. It never refuses. A refusal on a soft signal
 * falls on the member indoors with an old phone far more often than on the
 * cheat, and the cheat can try again while the honest member cannot.
 */

export const RISK_REASONS = [
  /** The page found something other than native code behind the geolocation API. */
  "patched-api",
  /** The browser admitted it is driven by automation. */
  "automated-browser",
  /** Every reading in the burst named the same spot to the half metre. */
  "frozen-track",
  /** The last accepted reading for this person is too far away to have walked. */
  "teleport",
  /** Someone else at this event sent the very same coordinates. */
  "shared-coordinates",
  /** The address the request came from resolves far from the claimed spot. */
  "network-far",
  /** The address belongs to a hosting network, a proxy, or a VPN. */
  "network-relay",
  /** An error bar no consumer receiver reports. */
  "perfect-accuracy",
  /** Every reading claimed the same round error bar. */
  "constant-accuracy",
  /** Not one reading carried an altitude. */
  "no-altitude",
  /** The device clock sits in a different part of the world from the fence. */
  "timezone-mismatch",
  /** Only one reading arrived, so none of the movement checks could run. */
  "single-fix",
] as const;

export type RiskReason = (typeof RISK_REASONS)[number];

export function isRiskReason(value: unknown): value is RiskReason {
  return typeof value === "string" && (RISK_REASONS as readonly string[]).includes(value);
}

/**
 * Weights, not probabilities. One strong signal alone reaches the threshold.
 * The soft ones have to gather before they say anything.
 */
const WEIGHTS: Record<RiskReason, number> = {
  "patched-api": 45,
  "automated-browser": 40,
  teleport: 40,
  // A receiver never repeats a coordinate exactly, and two people never stand
  // in the same spot. Either one alone is enough to ask the organizer to look.
  "frozen-track": 40,
  "shared-coordinates": 40,
  "network-far": 25,
  "network-relay": 20,
  "perfect-accuracy": 20,
  "constant-accuracy": 15,
  "timezone-mismatch": 15,
  "no-altitude": 10,
  "single-fix": 10,
};

/** At or above this the record carries a flag and the organizer sees it. */
export const SUSPECT_AT = 40;

/** Faster than a commercial flight between two check-ins. */
const TELEPORT_KPH = 900;
/** Under this gap the speed check is noise, not evidence. */
const TELEPORT_MIN_METERS = 500;
/** Political timezones stretch about three hours from their solar hour. */
const TIMEZONE_TOLERANCE_HOURS = 3;
/** Two people cannot stand this close. Below it the readings were copied. */
const SHARED_METERS = 1;

export interface RiskInput {
  /** The burst the device sent. Null when the device sent nothing usable. */
  track: TrackReport | null;
  /** What the page saw of its own runtime. */
  environment: {
    /** False when `getCurrentPosition` no longer reads as native code. */
    nativeGeolocation: boolean;
    /** `navigator.webdriver`. */
    automated: boolean;
    /** Minutes, as `Date.prototype.getTimezoneOffset` reports them. */
    timezoneOffsetMinutes: number | null;
  };
  /** Where the fence is. The timezone check is judged against its longitude. */
  fence: Coordinates;
  /**
   * Where the network says the request came from. Null on a self-host with
   * no address intelligence, and on the Node target, which has no `cf`.
   */
  network: {
    position: Coordinates | null;
    /** True for a hosting, proxy, or VPN network. Null when unknown. */
    relay: boolean | null;
  };
  /** The last reading accepted for this person, for the movement check. */
  previous: TrackPoint | null;
  /** Readings already accepted at this event, to catch a copied position. */
  peers: readonly Coordinates[];
}

export type RiskLevel = "clear" | "suspect";

export interface RiskReport {
  score: number;
  level: RiskLevel;
  reasons: RiskReason[];
}

/**
 * How far the network address may sit from the claimed spot before it counts.
 * Mobile carriers route whole regions through one exit, so the allowance is
 * wide on purpose. It catches a country, not a suburb.
 */
const NETWORK_FAR_METERS = 500_000;

/** The reasons whose test came back true, in the order they were listed. */
function hits(pairs: readonly (readonly [RiskReason, boolean])[]): readonly RiskReason[] {
  return A.filterMap(pairs, ([reason, hit]) =>
    match(hit)
      .with(true, () => reason)
      .otherwise(() => undefined),
  );
}

function environmentReasons(input: RiskInput): readonly RiskReason[] {
  const { nativeGeolocation, automated, timezoneOffsetMinutes } = input.environment;

  // The sun, not a timezone database. An hour of longitude is 15 degrees,
  // and a political timezone strays at most about three hours from it. That
  // covers Spain and western China, the two worst cases, with no dependency.
  const solarHours = input.fence.longitude / 15;
  const offBy = match(timezoneOffsetMinutes)
    .with(P.number, (minutes) => Math.abs(-minutes / 60 - solarHours))
    .otherwise(() => 0);

  return hits([
    ["patched-api", !nativeGeolocation],
    ["automated-browser", automated],
    ["timezone-mismatch", offBy > TIMEZONE_TOLERANCE_HOURS],
  ]);
}

function trackReasons(track: TrackReport | null): readonly RiskReason[] {
  return match(track)
    .with(P.nullish, () => [])
    .otherwise((report) =>
      hits([
        ["frozen-track", report.frozen],
        ["single-fix", report.count === 1],
        ["no-altitude", report.flat],
        ["constant-accuracy", report.constantAccuracy],
        // A consumer receiver never claims a metre. A mock provider does.
        ["perfect-accuracy", report.best.accuracy > 0 && report.best.accuracy <= 1],
      ]),
    );
}

function historyReasons(input: RiskInput): readonly RiskReason[] {
  return match(input.track)
    .with(P.nullish, () => [])
    .otherwise((track) => {
      const here = { ...track.best };

      const teleported = match(input.previous)
        .with(P.nullish, () => false)
        .otherwise(
          (previous) =>
            // A short hop is noise, not evidence: two readings minutes apart
            // in one building can imply a silly speed and mean nothing.
            distanceMeters(previous, here) >= TELEPORT_MIN_METERS &&
            impliedSpeedKph(previous, here) > TELEPORT_KPH,
        );

      const shared = A.some(input.peers, (peer) => distanceMeters(peer, here) < SHARED_METERS);

      return hits([
        ["teleport", teleported],
        ["shared-coordinates", shared],
      ]);
    });
}

function networkReasons(input: RiskInput): readonly RiskReason[] {
  return match(input.track)
    .with(P.nullish, () => [])
    .otherwise((track) =>
      hits([
        [
          "network-far",
          match(input.network.position)
            .with(P.nullish, () => false)
            .otherwise((position) => distanceMeters(position, track.best) > NETWORK_FAR_METERS),
        ],
        ["network-relay", input.network.relay === true],
      ]),
    );
}

export function scoreRisk(input: RiskInput): RiskReport {
  const reasons = pipe(
    [
      ...environmentReasons(input),
      ...trackReasons(input.track),
      ...historyReasons(input),
      ...networkReasons(input),
    ],
    (all) => A.uniq(all),
    // Stable order, so two equal reports read the same in the review list.
    (all) => A.sortBy(all, (reason) => RISK_REASONS.indexOf(reason)),
  );

  const score = Math.min(
    100,
    A.reduce(reasons, 0, (total, reason) => total + WEIGHTS[reason]),
  );

  return {
    score,
    level: match(score >= SUSPECT_AT)
      .with(true, () => "suspect" as const)
      .otherwise(() => "clear" as const),
    reasons: [...reasons],
  };
}

/** What the organizer reads in the review list. One line per reason. */
export const RISK_REASON_TEXT: Record<RiskReason, string> = {
  "patched-api": "Something in the browser replaced the location API.",
  "automated-browser": "The browser reported that a script drives it.",
  "frozen-track": "Every reading named the same spot to the half metre.",
  teleport: "Too far from the last check-in to have travelled in the time.",
  "shared-coordinates": "Another person sent the very same coordinates.",
  "network-far": "The network address resolves far from the claimed spot.",
  "network-relay": "The network address belongs to a VPN or a hosting provider.",
  "perfect-accuracy": "The reading claimed an accuracy no phone reports.",
  "constant-accuracy": "Every reading claimed the same round accuracy.",
  "no-altitude": "No reading carried an altitude, so none came from satellites.",
  "timezone-mismatch": "The device clock belongs to another part of the world.",
  "single-fix": "Only one reading arrived, so movement could not be checked.",
};
