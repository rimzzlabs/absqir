import { attendanceKeys, attendanceMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: attendanceMutationKeys.remove(),
    mutationFn: async (id: string) => {
      const response = await api["attendance-sessions"][":id"].$delete({ param: { id } });

      if (!response.ok) {
        throw new Error("Could not delete the session.");
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}
