import type { AppType } from "@absqir/api";
import { O, pipe, R } from "@mobily/ts-belt";
import { hc } from "hono/client";
import { match, P } from "ts-pattern";

// Same origin as the site, so the base is a plain path. Call it from the
// browser only: a relative fetch has no origin to resolve against on the server.
export const api = hc<AppType>("/").api;

/** What hono's typed client and a plain fetch Response have in common. */
interface JsonResponse {
  json(): Promise<unknown>;
}

/** Every absqir route answers `{ error }` on failure; Better Auth answers `{ message }`. */
function messageOf(body: unknown): O.Option<string> {
  return match(body)
    .with({ error: P.string.minLength(1) }, (row) => row.error)
    .with({ message: P.string.minLength(1) }, (row) => row.message)
    .otherwise(() => O.None);
}

/** Turns a failed API response into an Error carrying the server's message. */
export async function apiError(response: JsonResponse, fallback: string): Promise<Error> {
  // A body that is not JSON is not a failure to report; the fallback covers it.
  const body = await R.fromPromise(response.json());

  return pipe(
    R.toOption(body),
    O.flatMap(messageOf),
    O.mapWithDefault(new Error(fallback), (message: string) => new Error(message)),
  );
}
