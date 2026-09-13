import {
  joinRequestKeys,
  joinRequestMutationKeys,
  organizationKeys,
} from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface DecideJoinRequestInput {
  id: string;
  decision: "approved" | "declined";
  note?: string;
}

/** Lets somebody in, or turns them down. Either way the account is told. */
export function useDecideJoinRequest() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: joinRequestMutationKeys.decide(),
    mutationFn: async ({ id, decision, note }: DecideJoinRequestInput) => {
      const response = await api.organizations["join-requests"][":id"].decide.$post({
        param: { id },
        json: { decision, note },
      });

      if (!response.ok) throw await apiError(response, t("errors:couldNotSaveDecision"));

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: joinRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
