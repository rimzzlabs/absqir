import { eventKeys, locationKeys, locationMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface PlaceInput {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

/**
 * Events keep their own copy of the fence, so a saved place changing never
 * moves a past event. Both caches are still cleared, because a future event
 * reads the place's name and an edit must show there at once.
 */
function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: locationKeys.all });
  void queryClient.invalidateQueries({ queryKey: eventKeys.all });
}

export function useCreatePlace() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: locationMutationKeys.create(),
    mutationFn: async (values: PlaceInput) => {
      const response = await api.locations.$post({ json: values });

      if (!response.ok) throw await apiError(response, t("errors:couldNotSavePlace"));

      return response.json();
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdatePlace() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: locationMutationKeys.update(),
    mutationFn: async ({ id, ...values }: PlaceInput & { id: string }) => {
      const response = await api.locations[":id"].$patch({ param: { id }, json: values });

      if (!response.ok) throw await apiError(response, t("errors:couldNotSavePlace"));

      return response.json();
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useRemovePlace() {
  const t = useTranslate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: locationMutationKeys.remove(),
    mutationFn: async (id: string) => {
      const response = await api.locations[":id"].$delete({ param: { id } });

      if (!response.ok) throw await apiError(response, t("errors:couldNotDeletePlace"));

      return response.json();
    },
    onSuccess: () => invalidate(queryClient),
  });
}
