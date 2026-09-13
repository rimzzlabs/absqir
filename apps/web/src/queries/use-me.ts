import { meKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** The signed-in user with their onboarding step and every membership. */
export function useMe() {
  const t = useTranslate();
  return useQuery({
    queryKey: meKeys.current(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.me.$get(undefined, { init: { signal: ctx.signal } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotReadAccount"));

      return response.json();
    },
  });
}

export type Me = NonNullable<ReturnType<typeof useMe>["data"]>;
export type Membership = Me["memberships"][number];
