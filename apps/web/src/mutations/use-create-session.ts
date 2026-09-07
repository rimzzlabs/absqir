import { attendanceKeys, attendanceMutationKeys } from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateSessionValues } from "@/lib/attendance-schemas";

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: attendanceMutationKeys.create(),
    mutationFn: async (values: CreateSessionValues) => {
      const response = await api["attendance-sessions"].$post({ json: values });

      if (!response.ok) {
        throw new Error("Could not create the session.");
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.list() });
    },
  });
}
