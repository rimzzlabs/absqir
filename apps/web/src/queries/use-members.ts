import { organizationKeys } from "@absqir/core/query-keys";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

/** The accounts in the active organization, with their roles. */
export function useMembers() {
  return useQuery({
    queryKey: organizationKeys.members(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const { data, error } = await authClient.organization.listMembers({
        query: { limit: 500, sortBy: "createdAt", sortDirection: "asc" },
        fetchOptions: { signal: ctx.signal },
      });

      if (error || !data) {
        throw new Error(error?.message ?? "Could not load the members.");
      }

      return data.members;
    },
  });
}

export type Member = NonNullable<ReturnType<typeof useMembers>["data"]>[number];

/** Pending invitations of the active organization. */
export function useInvitations() {
  return useQuery({
    queryKey: organizationKeys.invitations(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const { data, error } = await authClient.organization.listInvitations({
        fetchOptions: { signal: ctx.signal },
      });

      if (error || !data) {
        throw new Error(error?.message ?? "Could not load the invitations.");
      }

      const now = Date.now();

      return data.filter(
        (row) => row.status === "pending" && new Date(row.expiresAt).getTime() > now,
      );
    },
  });
}

export type Invitation = NonNullable<ReturnType<typeof useInvitations>["data"]>[number];

/** One invitation by id, for the accept page. Works signed out. */
export function useInvitation(id: string) {
  return useQuery({
    queryKey: organizationKeys.invitation(id),
    retry: false,
    queryFn: async (ctx: QueryFunctionContext) => {
      const { data, error } = await authClient.organization.getInvitation({
        query: { id },
        fetchOptions: { signal: ctx.signal },
      });

      if (error || !data) {
        throw new Error(error?.message ?? "This invitation does not exist, or it expired.");
      }

      return data;
    },
  });
}
