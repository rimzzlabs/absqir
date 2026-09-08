import { sessionListKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export type SessionScope = "upcoming" | "past" | "all";

export function useSessions(scope: SessionScope = "upcoming") {
  return useQuery({
    queryKey: sessionListKeys.list(scope),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.sessions.$get(
        { query: { scope } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the sessions.");

      return response.json();
    },
    // A running session moves through its statuses on the clock.
    refetchInterval: 60_000,
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: sessionListKeys.detail(id),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.sessions[":id"].$get(
        { param: { id } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the session.");

      return response.json();
    },
    refetchInterval: 30_000,
  });
}

export function useSessionRecords(id: string) {
  return useQuery({
    queryKey: sessionListKeys.records(id),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.sessions[":id"].records.$get(
        { param: { id } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the records.");

      return response.json();
    },
    // Check-ins land while the organizer watches the list.
    refetchInterval: 5_000,
  });
}

export type Session = NonNullable<ReturnType<typeof useSessions>["data"]>[number];
export type SessionRecord = NonNullable<ReturnType<typeof useSessionRecords>["data"]>[number];
