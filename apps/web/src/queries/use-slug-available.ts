import { isReservedSlug } from "@absqir/core/org-path";
import { organizationKeys } from "@absqir/core/query-keys";
import { isSlug } from "@absqir/core/slug";
import { useQuery } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { authClient } from "@/lib/auth-client";

/** What the reader is told about the slug they typed. */
export type SlugState = "empty" | "invalid" | "reserved" | "checking" | "free" | "taken";

export interface SlugAvailableParams {
  slug: string;
  /** The slug the organization already holds. It is free for that one. */
  own?: string;
}

/**
 * Whether the slug is still free. The answer arrives before the reader
 * submits, because a slug refused on submit costs a round trip and a form
 * that has already closed over the name.
 *
 * A slug absqir keeps for itself is refused here, with no request: the list
 * is the same one the server reads.
 */
export function useSlugAvailable(params: SlugAvailableParams): SlugState {
  const slug = params.slug.trim();
  const own = params.own?.trim() ?? "";
  const asked = isSlug(slug) && !isReservedSlug(slug) && slug !== own;

  const query = useQuery({
    queryKey: organizationKeys.slug(slug),
    enabled: asked,
    // A slug that is taken stays taken, so the answer is worth keeping for
    // as long as the reader is typing around it.
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const { error } = await authClient.organization.checkSlug({ slug });

      return error === null;
    },
  });

  if (slug === "") return "empty";
  if (isReservedSlug(slug)) return "reserved";
  if (!isSlug(slug)) return "invalid";
  if (slug === own) return "free";
  if (query.data === undefined) return "checking";

  return match(query.data)
    .with(true, () => "free" as const)
    .otherwise(() => "taken" as const);
}
