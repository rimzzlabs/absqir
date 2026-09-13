import {
  type Circle,
  type Fix,
  formatDistance,
  MAX_ACCURACY_METERS,
  readFence,
  readTrack,
} from "@absqir/core/geo";
import { type RiskReason, SUSPECT_AT, scoreRisk } from "@absqir/core/location-risk";
import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import type { AttemptOutcome, AttendanceMethod, LocationVerdict } from "@absqir/db/schema";
import { A } from "@mobily/ts-belt";
import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { match, P } from "ts-pattern";
import { type NetworkReading, UNKNOWN_NETWORK } from "#src/lib/network";

const { attendanceRecord, checkInAttempt } = schema;

/**
 * The fence half of a check-in. The rotating code on the room screen is the
 * other half, and it is the stronger one: to hold a valid token you had to
 * see the live screen, and no amount of faked GPS produces one. This module
 * closes the gap the token leaves, which is the member who photographs the
 * screen and sends it to a friend across town.
 */

/** What an event carries once an organizer opts it in. */
export interface EventFence {
  requireLocation: boolean;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
}

/** What the page sends up with the check-in. */
export interface LocationClaim {
  fixes: Fix[];
  /** False when `getCurrentPosition` no longer reads as native code. */
  nativeGeolocation: boolean;
  automated: boolean;
  timezoneOffsetMinutes: number | null;
  /** The device's own IANA name, kept for the organizer to read. */
  timezone: string | null;
}

export interface LocationDecision {
  /** False when the event never asked, and nothing below was computed. */
  required: boolean;
  accepted: boolean;
  /** Why the check-in was refused. Null when it was not. */
  message: string | null;
  verdict: LocationVerdict | null;
  score: number;
  reasons: RiskReason[];
  /** True when the record must carry a flag for the organizer. */
  suspect: boolean;
  /** The columns to write on the attendance record. */
  columns: {
    latitude: number | null;
    longitude: number | null;
    accuracyMeters: number | null;
    distanceMeters: number | null;
    locationVerdict: LocationVerdict | null;
    riskScore: number | null;
    riskReasons: string[];
  };
}

const NOT_REQUIRED: LocationDecision = {
  required: false,
  accepted: true,
  message: null,
  verdict: null,
  score: 0,
  reasons: [],
  suspect: false,
  columns: {
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    distanceMeters: null,
    locationVerdict: null,
    riskScore: null,
    riskReasons: [],
  },
};

/** Null unless the organizer opted in and a full fence is on the event. */
export function fenceOf(event: EventFence): Circle | null {
  if (!event.requireLocation) return null;

  const { latitude, longitude, radiusMeters } = event;

  return match([latitude, longitude, radiusMeters])
    .with([P.number, P.number, P.number], ([lat, lon, radius]) => ({
      latitude: lat,
      longitude: lon,
      radiusMeters: radius,
    }))
    .otherwise(() => null);
}

export interface CheckLocationParams {
  db: Database;
  eventId: string;
  personId: string;
  event: EventFence;
  claim: LocationClaim | null;
  network?: NetworkReading;
  /**
   * Which door the check-in came through. `scanner` is one organizer device
   * reading many passes, so the crowd and movement checks are switched off
   * for it: every person that device admits shares its position, and none of
   * those positions belongs to the person's own history.
   */
  method: AttendanceMethod;
}

/**
 * The last place this person was accepted at, anywhere, for the movement
 * check. A record with no coordinates cannot answer, so it is skipped.
 */
async function previousFix(db: Database, personId: string) {
  const rows = await db
    .select({
      latitude: attendanceRecord.latitude,
      longitude: attendanceRecord.longitude,
      checkedInAt: attendanceRecord.checkedInAt,
    })
    .from(attendanceRecord)
    .where(and(eq(attendanceRecord.personId, personId), isNotNull(attendanceRecord.latitude)))
    .orderBy(desc(attendanceRecord.checkedInAt))
    .limit(1);

  const row = rows[0];
  if (!row || row.latitude === null || row.longitude === null || !row.checkedInAt) return null;

  return { latitude: row.latitude, longitude: row.longitude, at: row.checkedInAt.getTime() };
}

/** Everyone else's accepted position at this event, to catch a copied one. */
async function peerFixes(db: Database, eventId: string, personId: string) {
  const rows = await db
    .select({ latitude: attendanceRecord.latitude, longitude: attendanceRecord.longitude })
    .from(attendanceRecord)
    .where(
      and(
        eq(attendanceRecord.eventId, eventId),
        ne(attendanceRecord.personId, personId),
        isNotNull(attendanceRecord.latitude),
      ),
    );

  return A.filterMap(rows, (row) =>
    match([row.latitude, row.longitude])
      .with([P.number, P.number], ([latitude, longitude]) => ({ latitude, longitude }))
      .otherwise(() => undefined),
  );
}

function refusal(verdict: LocationVerdict, message: string): LocationDecision {
  return {
    ...NOT_REQUIRED,
    required: true,
    accepted: false,
    message,
    verdict,
    columns: { ...NOT_REQUIRED.columns, locationVerdict: verdict },
  };
}

/**
 * Decides the fence half of one check-in. It reads, it never writes: the
 * caller writes the attendance record, so one failed check-in leaves no row.
 */
export async function checkLocation(params: CheckLocationParams): Promise<LocationDecision> {
  const fence = fenceOf(params.event);
  if (!fence) return NOT_REQUIRED;

  const claim = params.claim;
  if (!claim) {
    return refusal(
      "missing",
      "This event checks where you are. Allow location in your browser, then scan again.",
    );
  }

  const track = readTrack(claim.fixes);
  if (!track) {
    return refusal(
      "missing",
      "Your device sent no location. Allow location in your browser, then scan again.",
    );
  }

  // A vague reading is refused rather than guessed at. A two-kilometre error
  // bar overlaps every fence in the city, so letting it in would mean the
  // fence stops meaning anything for everyone.
  if (track.best.accuracy > MAX_ACCURACY_METERS) {
    return {
      ...refusal(
        "coarse",
        "Your device could not place you accurately enough. Step outside or near a window, then scan again.",
      ),
      columns: {
        ...NOT_REQUIRED.columns,
        latitude: track.best.latitude,
        longitude: track.best.longitude,
        accuracyMeters: track.best.accuracy,
        locationVerdict: "coarse",
      },
    };
  }

  const reading = readFence(fence, track.best);
  const network = params.network ?? UNKNOWN_NETWORK;
  const ownDevice = params.method !== "scanner";

  const [previous, peers] = await Promise.all([
    match(ownDevice)
      .with(true, () => previousFix(params.db, params.personId))
      .otherwise(() => Promise.resolve(null)),
    match(ownDevice)
      .with(true, () => peerFixes(params.db, params.eventId, params.personId))
      .otherwise(() => Promise.resolve([])),
  ]);

  const risk = scoreRisk({
    track,
    environment: {
      nativeGeolocation: claim.nativeGeolocation,
      automated: claim.automated,
      timezoneOffsetMinutes: claim.timezoneOffsetMinutes,
    },
    fence,
    network: { position: network.position, relay: network.relay },
    previous,
    peers,
  });

  const columns = {
    latitude: track.best.latitude,
    longitude: track.best.longitude,
    accuracyMeters: track.best.accuracy,
    distanceMeters: reading.distanceMeters,
    locationVerdict: reading.verdict,
    riskScore: risk.score,
    riskReasons: [...risk.reasons],
  };

  // Only the geometry refuses. Every other signal is soft, and a soft signal
  // that locks a door falls on the member with an old phone far more often
  // than on the one person gaming it.
  if (reading.verdict === "outside") {
    return {
      required: true,
      accepted: false,
      message: `You are about ${formatDistance(reading.distanceMeters)} away. Move closer, then scan again.`,
      verdict: reading.verdict,
      score: risk.score,
      reasons: risk.reasons,
      suspect: risk.score >= SUSPECT_AT,
      columns,
    };
  }

  return {
    required: true,
    accepted: true,
    message: null,
    verdict: reading.verdict,
    score: risk.score,
    reasons: risk.reasons,
    suspect: risk.score >= SUSPECT_AT,
    columns,
  };
}

export interface RecordAttemptParams {
  db: Database;
  organizationId: string;
  eventId: string;
  personId: string;
  method: AttendanceMethod;
  outcome: AttemptOutcome;
  decision: LocationDecision;
  claim: LocationClaim | null;
  network?: NetworkReading;
  userAgent: string | null;
}

/**
 * Writes the audit row. Refusals matter most: one is a member in the wrong
 * place, and thirty across a term, each a little nearer the fence, is
 * somebody finding the line.
 */
export async function recordAttempt(params: RecordAttemptParams): Promise<string> {
  const network = params.network ?? UNKNOWN_NETWORK;
  const { columns } = params.decision;
  const id = crypto.randomUUID();

  await params.db.insert(checkInAttempt).values({
    id,
    organizationId: params.organizationId,
    eventId: params.eventId,
    personId: params.personId,
    outcome: params.outcome,
    method: params.method,
    locationVerdict: columns.locationVerdict,
    latitude: columns.latitude,
    longitude: columns.longitude,
    accuracyMeters: columns.accuracyMeters,
    distanceMeters: columns.distanceMeters,
    fixCount: params.claim?.fixes.length ?? 0,
    riskScore: params.decision.score,
    riskReasons: columns.riskReasons,
    networkLatitude: network.position?.latitude ?? null,
    networkLongitude: network.position?.longitude ?? null,
    networkAsn: network.asn,
    networkOrganization: network.organization,
    userAgent: params.userAgent,
  });

  // The id goes back to the member on a refusal, so a report can name the
  // attempt it is about rather than guessing at the latest one.
  return id;
}
