import { attendanceKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAttendanceSession(sessionId: string) {
  return useQuery({
    queryKey: attendanceKeys.detail(sessionId),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api["attendance-sessions"][":id"].$get(
        { param: { id: sessionId } },
        { init: { signal: ctx.signal } },
      );

      if (response.status === 404) {
        throw new Error("This session does not exist, or it belongs to another organization.");
      }

      if (!response.ok) {
        throw new Error("Could not load the session.");
      }

      return response.json();
    },
  });
}
