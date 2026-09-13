import { peopleKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { match, P } from "ts-pattern";
import { api, apiError } from "@/lib/api";

export function usePeople(query = "") {
  return useQuery({
    queryKey: peopleKeys.list(query),
    queryFn: async (ctx: QueryFunctionContext) => {
      const response = await api.people.$get(
        {
          query: match(query)
            .with(P.string.minLength(1), (query) => ({ q: query }))
            .otherwise(() => ({})),
        },
        { init: { signal: ctx.signal } },
      );

      if (!response.ok) throw await apiError(response, "Could not load the directory.");

      return response.json();
    },
    // Typing in the search box swaps the key; the old rows stay until new ones land.
    placeholderData: (previous) => previous,
  });
}

export type Person = NonNullable<ReturnType<typeof usePeople>["data"]>[number];
