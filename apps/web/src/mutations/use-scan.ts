import { eventKeys, eventMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { api, apiError } from "@/lib/api";
import { cachedLocationClaim, type LocationClaim } from "@/lib/location-claim";

export interface ScanInput {
  eventId: string;
  code: string;
}

type ScanBody = { code: string; location?: LocationClaim };

async function post(eventId: string, body: ScanBody) {
  return api.events[":id"].scan.$post({ param: { id: eventId }, json: body });
}

/**
 * The organizer's scanner reading a member's pass.
 *
 * An event with a fence judges the scanning device, because that device is
 * the door the member is standing at. As with the member's own check-in, the
 * first try carries nothing, and the reading is only taken once the server
 * says it wanted one. The reading is then reused for the rest of the queue.
 */
export function useScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.scan(),
    mutationFn: async ({ eventId, code }: ScanInput) => {
      const first = await post(eventId, { code });
      if (first.ok) return await first.json();

      // Only a missing reading is worth retrying. "outside" and "coarse"
      // describe where this scanner is, and asking it again changes nothing.
      const wantsLocation = await match(first.status)
        .with(409, async () => {
          const body: unknown = await first.clone().json();

          return match(body)
            .with({ location: { verdict: "missing" } }, () => true)
            .otherwise(() => false);
        })
        .otherwise(() => Promise.resolve(false));

      if (!wantsLocation) throw await apiError(first, "Could not read that pass.");

      const location = await cachedLocationClaim();

      const second = await post(eventId, { code, location });
      if (!second.ok) throw await apiError(second, "Could not read that pass.");

      return await second.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export type ScanResult = Awaited<ReturnType<ReturnType<typeof useScan>["mutateAsync"]>>;
