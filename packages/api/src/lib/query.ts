import { match } from "ts-pattern";

/**
 * Runs the query only when there are keys to look for. Drizzle turns an empty
 * list into `in ()`, which no row can match, so the round trip is waste.
 */
export function whenAny<T, R>(
  keys: readonly T[],
  run: (keys: readonly T[]) => Promise<R[]>,
): Promise<R[]> {
  return match(keys)
    .when((some) => some.length > 0, run)
    .otherwise(() => Promise.resolve<R[]>([]));
}
