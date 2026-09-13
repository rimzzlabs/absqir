import { eventKeys, eventMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { match, P } from "ts-pattern";
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
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: eventMutationKeys.scan(),
    mutationFn: async ({ eventId, code }: ScanInput) => {
      const first = await post(eventId, { code });
      if (first.ok) return await first.json();

      // Only a missing reading is worth retrying. "outside" and "coarse"
      // describe where this scanner is, and asking it again changes nothing.
      const body: unknown = await first.json().catch(() => null);
      const wantsLocation =
        first.status === 409 &&
        match(body)
          .with({ location: { verdict: "missing" } }, () => true)
          .otherwise(() => false);

      if (!wantsLocation) {
        throw match(body)
          .with({ error: P.string.minLength(1) }, (found) => new Error(found.error))
          .otherwise(() => new Error(t("errors:couldNotReadPass")));
      }

      const location = await cachedLocationClaim();

      const second = await post(eventId, { code, location });
      if (!second.ok) throw await apiError(second, t("errors:couldNotReadPass"));

      return await second.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export type ScanResult = Awaited<ReturnType<ReturnType<typeof useScan>["mutateAsync"]>>;
