import { checkInReportKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export type ReportScope = "pending" | "decided" | "all";

/** The reports waiting on an organizer. */
export function useCheckInReports(scope: ReportScope) {
  return useQuery({
    queryKey: checkInReportKeys.queue(scope),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api["check-in-reports"].$get(
        { query: { status: scope } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the reports.");

      return response.json();
    },
  });
}

export type CheckInReport = NonNullable<ReturnType<typeof useCheckInReports>["data"]>[number];
