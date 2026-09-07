import { attendanceKeys, attendanceMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ToggleSessionValues {
  id: string;
  active: boolean;
}

export function useToggleSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: attendanceMutationKeys.toggle(),
    mutationFn: async (values: ToggleSessionValues) => {
      const response = await api["attendance-sessions"][":id"].$patch({
        param: { id: values.id },
        json: { active: values.active },
      });

      if (!response.ok) {
        throw new Error("Could not update the session.");
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}
