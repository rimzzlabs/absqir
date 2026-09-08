import { myKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { api, apiError } from "@/lib/api";

export function useMySessions() {
  return useQuery({
    queryKey: myKeys.sessions(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.my.sessions.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, "Could not load your sessions.");

      return response.json();
    },
    refetchInterval: 30_000,
  });
}

export function useMyPass(sessionId: string | null) {
  return useQuery({
    queryKey: myKeys.pass(sessionId ?? ""),
    enabled: sessionId !== null,
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.my.sessions[":id"].pass.$get(
        { param: { id: sessionId ?? "" } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load your pass.");

      const data = await response.json();

      return { ...data, qrDataUrl: await QRCode.toDataURL(data.code, { width: 512, margin: 1 }) };
    },
  });
}

export function useMyHistory() {
  return useQuery({
    queryKey: myKeys.history(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.my.history.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, "Could not load your history.");

      return response.json();
    },
  });
}

export type MySession = NonNullable<ReturnType<typeof useMySessions>["data"]>[number];
export type HistoryRow = NonNullable<ReturnType<typeof useMyHistory>["data"]>[number];
