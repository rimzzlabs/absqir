import {
  myKeys,
  organizationKeys,
  sessionListKeys,
  sessionMutationKeys,
} from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface SessionInput {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  lateAfterMinutes: number;
  opensBeforeMinutes: number;
  allowWalkIns: boolean;
  registrationOpen: boolean;
  registrationLimit: number | null;
  groupIds: string[];
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: sessionMutationKeys.create(),
    mutationFn: async (values: SessionInput) => {
      const response = await api.sessions.$post({ json: values });

      if (!response.ok) throw await apiError(response, "Could not create the session.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionListKeys.all });
      void queryClient.invalidateQueries({ queryKey: myKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
