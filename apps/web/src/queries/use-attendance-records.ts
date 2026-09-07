import { attendanceKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** The list refreshes while the QR screen is up, so new check-ins appear live. */
const REFETCH_MS = 5 * 1000;

export function useAttendanceRecords(sessionId: string) {
  return useQuery({
    queryKey: attendanceKeys.records(sessionId),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api["attendance-sessions"][":id"].records.$get(
        { param: { id: sessionId } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) {
        throw new Error("Could not load the check-ins.");
      }

      return response.json();
    },
    refetchInterval: REFETCH_MS,
  });
}
