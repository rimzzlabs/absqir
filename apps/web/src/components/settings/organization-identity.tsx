import { formatDate } from "@absqir/core/date";
import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import { Skeleton } from "@absqir/ui/skeleton";
import { CameraIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
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
  const logoLabel = logo ? "Change logo" : "Add a logo";

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReadError(null);

    try {
      save.mutate({ organizationId: props.organization.id, logo: await toAvatarDataUrl(file) });
    } catch (error) {
      setReadError(error instanceof Error ? error : new Error("Could not read that picture."));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 py-6">
      <Avatar size="lg" className="size-24">
        {logo ? <AvatarImage src={logo} alt="" /> : null}
        <AvatarFallback
          name={props.organization.name}
          className="text-2xl font-medium tracking-wide"
        >
          {initialsOf(props.organization.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 basis-56">
        <p className="font-heading truncate text-xl font-semibold tracking-tight">
          {props.organization.name}
        </p>
        <p className="text-muted-foreground truncate font-mono text-sm">
          {props.organization.slug}
        </p>
        <div className="mt-2">
          {current.data ? (
            <span className="text-muted-foreground text-xs">
              Started {formatDate(new Date(current.data.createdAt))}
            </span>
          ) : (
            <Skeleton className="h-4 w-32" />
          )}
        </div>
      </div>

      {props.canEdit ? (
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
              {save.isPending ? "Saving…" : logoLabel}
            </Button>
            {logo ? (
              <Button
                type="button"
                variant="ghost"
                disabled={save.isPending}
                onClick={() => save.mutate({ organizationId: props.organization.id, logo: null })}
              >
                <XIcon />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            PNG, JPEG or WebP. Shrunk to 128px. It shows in the workspace switcher.
          </p>
          <FormError error={readError ?? save.error} />
        </div>
      ) : null}
    </div>
  );
}
