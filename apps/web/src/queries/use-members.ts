import { organizationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { A } from "@mobily/ts-belt";
import { type QueryFunctionContext, useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error";

export interface UseMembersOptions {
  /** Off until the caller needs the list, such as an owner-only check. */
  enabled?: boolean;
}

/** The accounts in the active organization, with their roles. */
export function useMembers(options?: UseMembersOptions) {
  const t = useTranslate();
  return useQuery({
    queryKey: organizationKeys.members(),
    enabled: options?.enabled ?? true,
    queryFn: async (ctx: QueryFunctionContext) => {
      const { data, error } = await authClient.organization.listMembers({
        query: { limit: 500, sortBy: "createdAt", sortDirection: "asc" },
        fetchOptions: { signal: ctx.signal },
      });

      if (error || !data) {
        throw authErrorMessage(t, error ?? null, t("errors:couldNotLoadMembers"));
      }

      return data.members;
    },
  });
}

export type Member = NonNullable<ReturnType<typeof useMembers>["data"]>[number];

/** Pending invitations of the active organization. */
export function useInvitations() {
  const t = useTranslate();
  return useQuery({
    queryKey: organizationKeys.invitations(),
    queryFn: async (ctx: QueryFunctionContext) => {
      const { data, error } = await authClient.organization.listInvitations({
        fetchOptions: { signal: ctx.signal },
      });

      if (error || !data) {
        throw authErrorMessage(t, error ?? null, t("errors:couldNotLoadInvitations"));
      }

      const now = Date.now();

      return A.filter(
        data,
        (row) => row.status === "pending" && new Date(row.expiresAt).getTime() > now,
      );
    },
  });
}

export type Invitation = NonNullable<ReturnType<typeof useInvitations>["data"]>[number];

/** One invitation by id, for the accept page. Works signed out. */
export function useInvitation(id: string) {
  const t = useTranslate();
  return useQuery({
    queryKey: organizationKeys.invitation(id),
    retry: false,
    queryFn: async (ctx: QueryFunctionContext) => {
      const { data, error } = await authClient.organization.getInvitation({
        query: { id },
        fetchOptions: { signal: ctx.signal },
      });

      if (error || !data) {
        throw authErrorMessage(t, error ?? null, t("errors:invitationMissing"));
      }

      return data;
    },
  });
}
