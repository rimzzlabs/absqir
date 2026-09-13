import { scheduleKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export function useSchedules() {
  const t = useTranslate();
  return useQuery({
    queryKey: scheduleKeys.list(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.schedules.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotLoadSchedules"));

      return response.json();
    },
  });
}

export type Schedule = NonNullable<ReturnType<typeof useSchedules>["data"]>[number];
