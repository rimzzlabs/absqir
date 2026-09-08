import { accountKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useInfiniteQuery } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Every browser signed in as me, this one first, then the most recent, page by page. */
export function useDevices() {
  return useInfiniteQuery({
    queryKey: accountKeys.devices(),
    initialPageParam: null as string | null,
    queryFn: async (ctx: QueryFunctionContext<readonly unknown[], string | null>) => {
      const response = await api.me.devices.$get(
        { query: { cursor: ctx.pageParam ?? undefined } },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not list your devices.");

      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export type Device = NonNullable<
  ReturnType<typeof useDevices>["data"]
>["pages"][number]["items"][number];
