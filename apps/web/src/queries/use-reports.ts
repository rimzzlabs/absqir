import { reportKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface ReportRange {
  from: Date;
  to: Date;
  /** Only events that expect this group. Null means every event. */
  groupId: string | null;
}

type RangeQuery = { from: string; to: string; groupId?: string };

function toQuery(range: ReportRange): RangeQuery {
  const query: RangeQuery = { from: range.from.toISOString(), to: range.to.toISOString() };
  if (range.groupId) query.groupId = range.groupId;

  return query;
}

/** One string per range, so every table caches under its own key. */
function rangeKey(range: ReportRange): string {
  return `${range.from.toISOString()}|${range.to.toISOString()}|${range.groupId ?? "all"}`;
}

/** Where the browser downloads the same table as a spreadsheet. */
export function reportCsvHref(table: "people" | "groups" | "events", range: ReportRange): string {
  const params = new URLSearchParams(toQuery(range));

  return `/api/reports/${table}.csv?${params.toString()}`;
}

export function useReportSummary(range: ReportRange) {
  return useQuery({
    queryKey: reportKeys.summary(rangeKey(range)),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.reports.summary.$get(
        { query: toQuery(range) },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the totals.");

      return response.json();
    },
  });
}

export function useReportPeople(range: ReportRange) {
  return useQuery({
    queryKey: reportKeys.people(rangeKey(range)),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.reports.people.$get(
        { query: toQuery(range) },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the people report.");

      return response.json();
    },
  });
}

export function useReportGroups(range: ReportRange) {
  return useQuery({
    queryKey: reportKeys.groups(rangeKey(range)),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.reports.groups.$get(
        { query: toQuery(range) },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the group report.");

      return response.json();
    },
  });
}

export function useReportEvents(range: ReportRange) {
  return useQuery({
    queryKey: reportKeys.events(rangeKey(range)),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.reports.events.$get(
        { query: toQuery(range) },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the event report.");

      return response.json();
    },
  });
}

export type ReportSummary = NonNullable<ReturnType<typeof useReportSummary>["data"]>;
export type PersonReportRow = NonNullable<ReturnType<typeof useReportPeople>["data"]>[number];
export type GroupReportRow = NonNullable<ReturnType<typeof useReportGroups>["data"]>[number];
export type EventReportRow = NonNullable<ReturnType<typeof useReportEvents>["data"]>[number];
