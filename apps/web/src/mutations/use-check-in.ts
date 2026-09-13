import { eventKeys, eventMutationKeys, myKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { api, apiError } from "@/lib/api";
import { collectLocationClaim, type LocationClaim } from "@/lib/location-claim";

export interface CheckInInput {
  eventId: string;
  token: string;
}

/** What the reader is waiting on. The location step is the slow one. */
export type CheckInStage = "idle" | "checking" | "locating";

type CheckInBody = { token: string; location?: LocationClaim };

/**
 * A refusal from the server, with the status kept. The page needs it: an
 * expired token is the one failure a reload cannot fix, because the token
 * sits in the address and is already dead.
 */
export class CheckInFailed extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CheckInFailed";
    this.status = status;
  }
}

/** The shape hono's typed client and a plain Response have in common. */
interface StatusResponse {
  status: number;
  json(): Promise<unknown>;
}

async function failure(response: StatusResponse, fallback: string): Promise<CheckInFailed> {
  const error = await apiError(response, fallback);

  return new CheckInFailed(error.message, response.status);
}

async function post(eventId: string, body: CheckInBody) {
  return api.events[":id"]["check-in"].$post({ param: { id: eventId }, json: body });
}

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

      // 409 means the fence spoke. Only a missing reading is worth retrying:
      // "outside" and "coarse" describe where the person is, and asking the
      // same device again in the same spot gives the same answer.
      const wantsLocation = await match(first.status)
        .with(409, async () => {
          const body: unknown = await first.clone().json();

          return match(body)
            .with({ location: { verdict: "missing" } }, () => true)
            .otherwise(() => false);
        })
        .otherwise(() => Promise.resolve(false));

      if (!wantsLocation) throw await failure(first, "Could not check you in.");

      setStage("locating");
      const location = await collectLocationClaim();

      setStage("checking");
      const second = await post(eventId, { token, location });
      if (!second.ok) throw await failure(second, "Could not check you in.");

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
  };
}

export type CheckInResult = Awaited<ReturnType<ReturnType<typeof useCheckIn>["mutateAsync"]>>;
