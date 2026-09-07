import { attendanceKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAttendanceSessions() {
  return useQuery({
    queryKey: attendanceKeys.list(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api["attendance-sessions"].$get(undefined, {
        init: { signal: ctx.signal },
      });

      if (!response.ok) {
        throw new Error("Could not load the sessions.");
      }

      return response.json();
    },
  });
}
