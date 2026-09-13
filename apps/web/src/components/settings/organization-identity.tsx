import { formatDate } from "@absqir/core/date";
import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import { Skeleton } from "@absqir/ui/skeleton";
import { CameraIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { initialsOf, toAvatarDataUrl } from "@/lib/avatar";
import { useUpdateOrganization } from "@/mutations/use-update-organization";
import { useOrganization } from "@/queries/use-organization";

export interface OrganizationIdentityProps {
  organization: { id: string; name: string; slug: string };
  canEdit: boolean;
}

/**
 * The logo, the name, and the day the organization started. The logo saves
 * as soon as it is chosen, the way the profile picture does, because the
 * workspace switcher is rendered on the server.
 */
export function OrganizationIdentity(props: OrganizationIdentityProps) {
  const [readError, setReadError] = useState<Error | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const current = useOrganization();
  const save = useUpdateOrganization();

  const logo = current.data?.logo ?? null;
  const logoLabel = match(logo)
    .with(P.string.minLength(1), () => "Change logo" as const)
    .otherwise(() => "Add a logo" as const);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReadError(null);

    try {
      save.mutate({ organizationId: props.organization.id, logo: await toAvatarDataUrl(file) });
    } catch (error) {
      setReadError(
        match(error)
          .with(P.instanceOf(Error), (error) => error)
          .otherwise(() => new Error("Could not read that picture.")),
      );
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 py-6">
      <Avatar className="size-16">
        {match(logo)
          .with(P.string.minLength(1), (logo) => <AvatarImage src={logo} alt="" />)
          .otherwise(() => null)}
        <AvatarFallback
          name={props.organization.name}
          className="text-xl font-medium tracking-wide"
        >
          {initialsOf(props.organization.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 basis-56">
        <p className="font-heading truncate text-base font-semibold tracking-tight">
          {props.organization.name}
        </p>
        <p className="text-muted-foreground truncate font-mono text-sm">
          {props.organization.slug}
        </p>
        <div className="mt-1.5">
          {match(current.data)
            .with(P.nullish, () => <Skeleton className="h-4 w-32" />)
            .otherwise((data) => (
              <span className="text-muted-foreground text-xs">
                Started {formatDate(new Date(data.createdAt))}
              </span>
            ))}
        </div>
      </div>

      {match(props.canEdit)
        .with(true, () => (
          <div className="flex flex-col gap-2 sm:items-end">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => fileInput.current?.click()}
              >
                <CameraIcon />
                {match(save.isPending)
                  .with(true, () => "Saving…" as const)
                  .otherwise(() => logoLabel)}
              </Button>
              {match(logo)
                .with(P.string.minLength(1), () => (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={save.isPending}
                    onClick={() =>
                      save.mutate({ organizationId: props.organization.id, logo: null })
                    }
                  >
                    <XIcon />
                    Remove
                  </Button>
                ))
                .otherwise(() => null)}
            </div>
            <p className="text-muted-foreground text-xs">
              PNG, JPEG or WebP. Shrunk to 128px. It shows in the workspace switcher.
            </p>
            <FormError error={readError ?? save.error} />
          </div>
        ))
        .otherwise(() => null)}
    </div>
  );
}
