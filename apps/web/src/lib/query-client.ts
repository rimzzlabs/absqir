import { QueryClient } from "@tanstack/react-query";

let client: QueryClient | undefined;

/**
 * Each Astro island mounts its own React root. They share this one client, so
 * two islands asking for the same key share one request and one cache entry.
 */
export function getQueryClient() {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: 1,
          refetchOnWindowFocus: true,
        },
      },
    });
  }

  return client;
}
