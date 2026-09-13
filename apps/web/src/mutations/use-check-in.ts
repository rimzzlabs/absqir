import { eventKeys, eventMutationKeys, myKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { api } from "@/lib/api";
import { collectLocationClaim, type LocationClaim } from "@/lib/location-claim";

export interface CheckInInput {
  eventId: string;
  token: string;
}

/** What the reader is waiting on. The location step is the slow one. */
export type CheckInStage = "idle" | "checking" | "locating";

/** What a member already sent about this event, so it is not offered twice. */
export type ReportState = "pending" | "approved" | "declined";

/** The fence's half of a refusal, when that is what turned the member away. */
export interface LocationRefusal {
  verdict: "outside" | "coarse" | "missing";
  /** The attempt a report should name. */
  attemptId: string | null;
  /** Null when this member has not reported this event yet. */
  reportStatus: ReportState | null;
}

/**
 * A refusal from the server, with the status kept. The page needs it: an
 * expired token is the one failure a reload cannot fix, because the token
 * sits in the address and is already dead.
 */
export class CheckInFailed extends Error {
  readonly status: number;
  readonly location: LocationRefusal | null;

  constructor(message: string, status: number, location: LocationRefusal | null) {
    super(message);
    this.name = "CheckInFailed";
    this.status = status;
    this.location = location;
  }
}

/** The shape hono's typed client and a plain Response have in common. */
interface StatusResponse {
  status: number;
  json(): Promise<unknown>;
}

/** A body that is not JSON is not a failure to report; the fallback covers it. */
async function readBody(response: StatusResponse): Promise<unknown> {
  return await response.json().catch(() => null);
}

/**
 * Only these three verdicts mean "your device let you down". A refusal for
 * any other reason has a fix the member should take instead, so no report
 * button is offered for it.
 */
function refusalOf(body: unknown): LocationRefusal | null {
  const verdict = match(body)
    .with({ location: { verdict: "outside" } }, () => "outside" as const)
    .with({ location: { verdict: "coarse" } }, () => "coarse" as const)
    .with({ location: { verdict: "missing" } }, () => "missing" as const)
    .otherwise(() => null);

  if (!verdict) return null;

  // Read separately: narrowing on the verdict alone loses the rest of the shape.
  return {
    verdict,
    attemptId: match(body)
      .with({ location: { attemptId: P.string } }, (found) => found.location.attemptId)
      .otherwise(() => null),
    reportStatus: match(body)
      .with({ location: { report: { status: "pending" } } }, () => "pending" as const)
      .with({ location: { report: { status: "approved" } } }, () => "approved" as const)
      .with({ location: { report: { status: "declined" } } }, () => "declined" as const)
      .otherwise(() => null),
  };
}

function failureFrom(body: unknown, status: number, fallback: string): CheckInFailed {
  const message = match(body)
    .with({ error: P.string.minLength(1) }, (found) => found.error)
    .otherwise(() => fallback);

  return new CheckInFailed(message, status, refusalOf(body));
}

type CheckInBody = { token: string; location?: LocationClaim };

async function post(eventId: string, body: CheckInBody) {
  return api.events[":id"]["check-in"].$post({ param: { id: eventId }, json: body });
}

const FALLBACK = "Could not check you in.";

/**
 * The member's own check-in, from the link the room screen carries.
 *
 * The first try carries no location, so an event with no fence never makes
 * anyone answer a permission prompt. Only when the server answers that it
 * wanted a reading does the browser ask for one, and the check-in is sent
 * again. Nothing is collected that an event did not ask for.
 */
export function useCheckIn() {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<CheckInStage>("idle");

  const mutation = useMutation({
    mutationKey: eventMutationKeys.checkIn(),
    mutationFn: async ({ eventId, token }: CheckInInput) => {
      setStage("checking");

      const first = await post(eventId, { token });
      if (first.ok) return await first.json();

      const body = await readBody(first);

      // 409 means the fence spoke. Only a missing reading is worth retrying:
      // "outside" and "coarse" describe where the person is, and asking the
      // same device again in the same spot gives the same answer.
      const wantsLocation = first.status === 409 && refusalOf(body)?.verdict === "missing";

      if (!wantsLocation) throw failureFrom(body, first.status, FALLBACK);

      setStage("locating");
      const location = await collectLocationClaim();

      setStage("checking");
      const second = await post(eventId, { token, location });
      if (!second.ok) throw failureFrom(await readBody(second), second.status, FALLBACK);

      return await second.json();
    },
    onSettled: () => setStage("idle"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });

  // A LocationRefused thrown by the browser already carries the sentence the
  // reader needs, and both callers render `error.message`, so it needs no
  // flag of its own.
  return {
    ...mutation,
    stage,
    /** The token died. Only a fresh scan fixes it, never a reload. */
    tokenExpired: match(mutation.error)
      .with(P.instanceOf(CheckInFailed), (error) => error.status === 401)
      .otherwise(() => false),
    /** Set when the place check turned the member away, so a report is offered. */
    locationRefusal: match(mutation.error)
      .with(P.instanceOf(CheckInFailed), (error) => error.location)
      .otherwise(() => null),
  };
}

export type CheckInResult = Awaited<ReturnType<ReturnType<typeof useCheckIn>["mutateAsync"]>>;
