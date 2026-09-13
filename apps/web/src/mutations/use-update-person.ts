import { peopleKeys, peopleMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

/** Every field is optional: the route patches only what it is given. */
export interface UpdatePersonInput {
  id: string;
  name?: string;
  email?: string | null;
  identifier?: string | null;
}

export function useUpdatePerson() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: peopleMutationKeys.update(),
    mutationFn: async ({ id, ...values }: UpdatePersonInput) => {
      const response = await api.people[":id"].$patch({ param: { id }, json: values });

      if (!response.ok) throw await apiError(response, t("errors:couldNotSavePerson"));

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}
