import { sessionListKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { api, apiError } from "@/lib/api";

/** Refetch a beat early, so the screen never shows a token past its window. */
const EARLY_MS = 500;
const MIN_INTERVAL_MS = 1000;

export function useQrToken(sessionId: string) {
  return useQuery({
    queryKey: sessionListKeys.qrToken(sessionId),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.sessions[":id"]["qr-token"].$get(
        { param: { id: sessionId } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the QR token.");

      const data = await response.json();
      const checkinUrl = new URL(data.checkinPath, window.location.origin).toString();

      return {
        checkinUrl,
        expiresAt: data.expiresAt,
        status: data.status,
        qrDataUrl: await QRCode.toDataURL(checkinUrl, { width: 640, margin: 1 }),
      };
    },
    refetchInterval: (query) => {
      const expiresAt = query.state.data?.expiresAt;
      if (!expiresAt) return MIN_INTERVAL_MS;

      const remaining = new Date(expiresAt).getTime() - Date.now() - EARLY_MS;
      return Math.max(remaining, MIN_INTERVAL_MS);
    },
    refetchIntervalInBackground: true,
  });
}
