import { organizationKeys, peopleKeys, peopleMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface CreatePersonInput {
  name: string;
  email: string | null;
  identifier: string | null;
  invite: boolean;
  role: "member" | "organizer" | "admin";
}

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: peopleMutationKeys.create(),
    mutationFn: async (values: CreatePersonInput) => {
      const response = await api.people.$post({ json: values });

      if (!response.ok) throw await apiError(response, "Could not add the person.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}
