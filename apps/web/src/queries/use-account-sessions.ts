import { accountKeys } from "@absqir/core/query-keys";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface AccountSession {
  id: string;
  token: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;
  /** The one that made this request. */
  current: boolean;
}

/** Every device signed in as me, this one first, then the most recent. */
export function useAccountSessions() {
  return useQuery({
    queryKey: accountKeys.sessions(),
    queryFn: async (): Promise<AccountSession[]> => {
      const [list, mine] = await Promise.all([authClient.listSessions(), authClient.getSession()]);

      if (list.error) throw new Error(list.error.message ?? "Could not list your devices.");

      const currentId = mine.data?.session.id ?? null;

      return (list.data ?? [])
        .map((row) => ({
          id: row.id,
          token: row.token,
          userAgent: row.userAgent ?? null,
          ipAddress: row.ipAddress ?? null,
          createdAt: new Date(row.createdAt).toISOString(),
          updatedAt: new Date(row.updatedAt).toISOString(),
          current: row.id === currentId,
        }))
        .sort(
          (a, b) => Number(b.current) - Number(a.current) || b.updatedAt.localeCompare(a.updatedAt),
        );
    },
  });
}
