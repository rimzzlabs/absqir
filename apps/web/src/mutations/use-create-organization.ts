import {
  attendanceKeys,
  organizationKeys,
  organizationMutationKeys,
  sessionKeys,
} from "@absqir/core/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  // The slug is globally unique, so a short random tail avoids collisions
  // between two organizations that share a name.
  const tail = crypto.randomUUID().slice(0, 8);

  return base.length > 0 ? `${base}-${tail}` : tail;
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: organizationMutationKeys.create(),
    mutationFn: async (name: string) => {
      const { data, error } = await authClient.organization.create({
        name,
        slug: toSlug(name),
      });

      if (error || !data) {
        throw new Error(error?.message ?? "Could not create the organization.");
      }

      const setActive = await authClient.organization.setActive({ organizationId: data.id });

      if (setActive.error) {
        throw new Error(setActive.error.message ?? "Could not switch to the new organization.");
      }

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}
