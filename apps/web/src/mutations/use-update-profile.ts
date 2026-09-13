import { accountMutationKeys } from "@absqir/core/query-keys";
import { useTranslate } from "@absqir/i18n/react";
import { useMutation } from "@tanstack/react-query";
import { api, apiError } from "@/lib/api";

export interface UpdateProfileInput {
  name: string;
  /** Undefined leaves the picture alone; null removes it. */
  image?: string | null;
}

/** The header is rendered on the server, so a saved profile reloads the page. */
export function useUpdateProfile() {
  const t = useTranslate();
  return useMutation({
    mutationKey: accountMutationKeys.profile(),
    mutationFn: async (values: UpdateProfileInput) => {
      const response = await api.me.$patch({ json: values });

      if (!response.ok) throw await apiError(response, t("errors:couldNotSaveYourProfile"));

      return response.json();
    },
    onSuccess: () => {
      window.location.reload();
    },
  });
}
