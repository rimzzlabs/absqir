import { organizationKeys, peopleKeys, peopleMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface ImportPeopleInput {
  csv: string;
  invite: boolean;
  role: "member" | "organizer" | "admin";
}

export function useImportPeople() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: peopleMutationKeys.import(),
    mutationFn: async (values: ImportPeopleInput) => {
      const response = await api.people.import.$post({ json: values });

      if (!response.ok) throw await apiError(response, "Could not import the file.");

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

export type ImportResult = Awaited<ReturnType<ReturnType<typeof useImportPeople>["mutateAsync"]>>;
