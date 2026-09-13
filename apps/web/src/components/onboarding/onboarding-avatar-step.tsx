import { useTranslate } from "@absqir/i18n/react";
import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { FormError } from "@/components/shared/form-error";
import { initialsOf, toAvatarDataUrl } from "@/lib/avatar";
import { useOnboardingAvatar } from "@/mutations/use-onboarding-avatar";
import type { OnboardingStatus } from "@/queries/use-onboarding";

export interface OnboardingAvatarStepProps {
  status: OnboardingStatus;
}

export function OnboardingAvatarStep(props: OnboardingAvatarStepProps) {
  const t = useTranslate();
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
      setResizeError(
        match(error)
          .with(P.instanceOf(Error), (error) => error)
          .otherwise(() => new Error(t("onboarding:avatar.unreadable"))),
      );
    }
  };

  return (
    <div className="space-y-6">
      <AuthHeading
        title={t("onboarding:avatar.title")}
        description={t("onboarding:avatar.description")}
      />

      <div className="flex items-center gap-5">
        <Avatar className="size-20">
          {match(image)
            .with(P.string.minLength(1), (image) => <AvatarImage src={image} alt="" />)
            .otherwise(() => null)}
          <AvatarFallback name={props.status.name} className="text-2xl font-medium tracking-wide">
            {initialsOf(props.status.name)}
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
          <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
            <UploadSimpleIcon />
            {match(image)
              .with(P.string.minLength(1), () => t("onboarding:avatar.chooseAnother"))
              .otherwise(() => t("onboarding:avatar.choose"))}
          </Button>
          <p className="text-muted-foreground text-xs">{t("onboarding:avatar.formats")}</p>
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
          {match(save.isPending)
            .with(true, () => t("common:actions.saving"))
            .otherwise(() => t("onboarding:avatar.saveAndContinue"))}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={save.isPending}
          onClick={() => save.mutate(null)}
        >
          {t("common:actions.skip")}
        </Button>
      </div>
    </div>
  );
}
