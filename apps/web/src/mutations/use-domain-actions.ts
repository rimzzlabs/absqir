import { domainKeys, domainMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export type JoinPolicy = "closed" | "request" | "auto";

/** Claims a domain. It stays unverified until the TXT record is in place. */
export function useClaimDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: domainMutationKeys.claim(),
    mutationFn: async (domain: string) => {
      const response = await api.organizations.domains.$post({ json: { domain } });

      if (!response.ok) throw await apiError(response, "Could not claim the domain.");

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.all });
    },
  });
}

/** Reads the TXT record. The reply says whether the claim is proven now. */
export function useVerifyDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: domainMutationKeys.verify(),
    mutationFn: async (id: string) => {
      const response = await api.organizations.domains[":id"].verify.$post({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not check the record.");

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.all });
    },
  });
}

export function useReleaseDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: domainMutationKeys.release(),
    mutationFn: async (id: string) => {
      const response = await api.organizations.domains[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, "Could not release the domain.");

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.all });
    },
  });
}

/** Says what a verified domain opens for a matching account. */
export function useSetJoinPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: domainMutationKeys.policy(),
    mutationFn: async (joinPolicy: JoinPolicy) => {
      const response = await api.organizations["join-policy"].$post({ json: { joinPolicy } });

      if (!response.ok) throw await apiError(response, "Could not save the policy.");

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.all });
    },
  });
}
