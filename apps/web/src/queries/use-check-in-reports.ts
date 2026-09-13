import { checkInReportKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export type ReportScope = "pending" | "decided" | "all";

/** The reports waiting on an organizer. */
export function useCheckInReports(scope: ReportScope) {
  const t = useTranslate();
  return useQuery({
    queryKey: checkInReportKeys.queue(scope),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api["check-in-reports"].$get(
        { query: { status: scope } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadReports"));

      return response.json();
    },
  });
}

export type CheckInReport = NonNullable<ReturnType<typeof useCheckInReports>["data"]>[number];
