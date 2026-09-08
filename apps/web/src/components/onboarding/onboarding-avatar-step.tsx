import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { FormError } from "@/components/shared/form-error";
import { initialsOf, toAvatarDataUrl } from "@/lib/avatar";
import { useOnboardingAvatar } from "@/mutations/use-onboarding-avatar";
import type { OnboardingStatus } from "@/queries/use-onboarding";

export interface OnboardingAvatarStepProps {
  status: OnboardingStatus;
}

export function OnboardingAvatarStep(props: OnboardingAvatarStepProps) {
  const [image, setImage] = useState<string | null>(props.status.image);
  const [resizeError, setResizeError] = useState<Error | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const save = useOnboardingAvatar();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setResizeError(null);

    try {
      setImage(await toAvatarDataUrl(file));
    } catch (error) {
      setResizeError(error instanceof Error ? error : new Error("Could not read that picture."));
    }
  };

  return (
    <div className="space-y-6">
      <AuthHeading
        title="Add a picture"
        description="Optional. It helps organizers spot you in a list. You can skip this."
      />

      <div className="flex items-center gap-5">
        <Avatar size="lg" className="size-20">
          {image ? <AvatarImage src={image} alt="" /> : null}
          <AvatarFallback className="text-lg">{initialsOf(props.status.name)}</AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
            <UploadSimpleIcon />
            {image ? "Choose another" : "Choose a picture"}
          </Button>
          <p className="text-muted-foreground text-xs">PNG, JPEG, or WebP. Shrunk to 128px.</p>
        </div>
      </div>

      <FormError error={resizeError ?? save.error} />

      <div className="flex gap-3">
        <Button
          type="button"
          className="flex-1"
          disabled={save.isPending || !image}
          onClick={() => save.mutate(image)}
        >
          {save.isPending ? "Saving…" : "Save and continue"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={save.isPending}
          onClick={() => save.mutate(null)}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
