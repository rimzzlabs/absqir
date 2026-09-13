import { formatDate } from "@absqir/core/date";
import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { O, pipe } from "@mobily/ts-belt";
import { CameraIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { AccountDangerZone } from "@/components/account/account-danger-zone";
import { EmailChange } from "@/components/account/email-change";
import { TimezoneRow } from "@/components/account/timezone-row";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { FormError } from "@/components/shared/form-error";
import { RoleBadge, type RoleName } from "@/components/shared/role-badge";
import { type NameValues, nameSchema } from "@/lib/account-schemas";
import { initialsOf, toAvatarDataUrl } from "@/lib/avatar";
import { useUpdateProfile } from "@/mutations/use-update-profile";

export interface ProfilePanelProps {
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  /** Null while the account belongs to no organization. */
  role: RoleName | null;
  /** The stored zone. Null follows the device. */
  timezone: string | null;
  /** Null alongside a null role. The danger zone offers to leave it. */
  organization: { id: string; name: string; slug: string } | null;
}

/**
 * The picture saves on its own as soon as it is chosen; the page reloads
 * with it, because the header renders on the server.
 */
function Identity(props: ProfilePanelProps) {
  const [readError, setReadError] = useState<Error | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const save = useUpdateProfile();
  const pictureLabel = match(props.image)
    .with(P.string.minLength(1), () => "Change picture")
    .otherwise(() => "Add a picture" as const);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReadError(null);

    try {
      save.mutate({ name: props.name, image: await toAvatarDataUrl(file) });
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
        {match(props.image)
          .with(P.string.minLength(1), (image) => <AvatarImage src={image} alt="" />)
          .otherwise(() => null)}
        <AvatarFallback name={props.name} className="text-xl font-medium tracking-wide">
          {initialsOf(props.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 basis-56">
        <p className="font-heading truncate text-base font-semibold tracking-tight">{props.name}</p>
        <p className="text-muted-foreground truncate text-sm">{props.email}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {match(props.role)
            .with(P.string.minLength(1), (role) => <RoleBadge role={role} />)
            .otherwise(() => null)}
          <span className="text-muted-foreground text-xs">
            Joined {formatDate(new Date(props.createdAt))}
          </span>
        </div>
      </div>

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
              .otherwise(() => pictureLabel)}
          </Button>
          {match(props.image)
            .with(P.string.minLength(1), () => (
              <Button
                type="button"
                variant="ghost"
                disabled={save.isPending}
                onClick={() => save.mutate({ name: props.name, image: null })}
              >
                <XIcon />
                Remove
              </Button>
            ))
            .otherwise(() => null)}
        </div>
        <p className="text-muted-foreground text-xs">PNG, JPEG or WebP. Shrunk to 128px.</p>
        <FormError error={readError ?? save.error} />
      </div>
    </div>
  );
}

function NameRow(props: { name: string }) {
  const save = useUpdateProfile();
  const form = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: props.name },
  });

  return (
    <SettingsRow label="Name" hint="As organizers and the people in your groups see it.">
      <form
        onSubmit={form.handleSubmit((values) => save.mutate({ name: values.name }))}
        className="flex flex-wrap items-start gap-2"
        noValidate
      >
        <div className="min-w-0 flex-1 basis-64">
          <Input
            {...form.register("name")}
            id="name"
            aria-label="Name"
            autoComplete="name"
            aria-invalid={pipe(
              O.fromNullable(form.formState.errors.name),
              O.map(() => true),
              O.toUndefined,
            )}
          />
          {match(form.formState.errors.name)
            .with(P.nullish, () => null)
            .otherwise((name) => (
              <p role="alert" className="text-destructive mt-1.5 text-sm">
                {name.message}
              </p>
            ))}
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={save.isPending || !form.formState.isDirty}
        >
          {match(save.isPending)
            .with(true, () => "Saving…" as const)
            .otherwise(() => "Save" as const)}
        </Button>
        <FormError error={save.error} />
      </form>
    </SettingsRow>
  );
}

function EmailRow(props: { email: string }) {
  const [changing, setChanging] = useState(false);

  return (
    <SettingsRow label="Email" hint="Where you sign in and where reminders go.">
      {match(changing)
        .with(true, () => <EmailChange onCancel={() => setChanging(false)} />)
        .otherwise(() => (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm">{props.email}</p>
            <Button type="button" variant="outline" onClick={() => setChanging(true)}>
              Change email
            </Button>
          </div>
        ))}
    </SettingsRow>
  );
}

/** Who you are to the people who run attendance. */
export function ProfilePanel(props: ProfilePanelProps) {
  return (
    <div className="space-y-12">
      <SettingsSection title="Profile" description="Your name and picture, as organizers see them.">
        <Identity {...props} />
        <div className="border-border border-t">
          <NameRow name={props.name} />
          <EmailRow email={props.email} />
          <TimezoneRow timezone={props.timezone} />
        </div>
      </SettingsSection>

      <AccountDangerZone role={props.role} organization={props.organization} />
    </div>
  );
}
