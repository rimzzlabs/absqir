import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { UploadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/shared/form-error";
import { type NameValues, nameSchema } from "@/lib/account-schemas";
import { initialsOf, toAvatarDataUrl } from "@/lib/avatar";
import { useUpdateProfile } from "@/mutations/use-update-profile";

export interface ProfileCardProps {
  name: string;
  image: string | null;
}

export function ProfileCard(props: ProfileCardProps) {
  // Undefined means untouched, so the server leaves the picture alone.
  const [image, setImage] = useState<string | null | undefined>(undefined);
  const [readError, setReadError] = useState<Error | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const save = useUpdateProfile();

  const form = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: props.name },
  });

  const shown = image === undefined ? props.image : image;
  const dirty = form.formState.isDirty || image !== undefined;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReadError(null);

    try {
      setImage(await toAvatarDataUrl(file));
    } catch (error) {
      setReadError(error instanceof Error ? error : new Error("Could not read that picture."));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name and picture, as organizers see them.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => save.mutate({ name: values.name, image }))}
            className="space-y-5"
            noValidate
          >
            <div className="flex items-center gap-5">
              <Avatar size="lg" className="size-16">
                {shown ? <AvatarImage src={shown} alt="" /> : null}
                <AvatarFallback className="text-lg">
                  {initialsOf(form.watch("name"))}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
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
                    size="sm"
                    onClick={() => fileInput.current?.click()}
                  >
                    <UploadSimpleIcon />
                    {shown ? "Change picture" : "Add a picture"}
                  </Button>
                  {shown ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setImage(null)}>
                      <XIcon />
                      Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">
                  PNG, JPEG, or WebP. Shrunk to 128px.
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              label="Name"
              render={(field) => <Input {...field} id="name" autoComplete="name" />}
            />

            <FormError error={readError ?? save.error} />

            <Button type="submit" disabled={save.isPending || !dirty}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
