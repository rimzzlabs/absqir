import { useEffect } from "react";
import { match, P } from "ts-pattern";
import { OnboardingAvatarStep } from "@/components/onboarding/onboarding-avatar-step";
import { OnboardingOrganizationStep } from "@/components/onboarding/onboarding-organization-step";
import { OnboardingProfileStep } from "@/components/onboarding/onboarding-profile-step";
import { OnboardingSteps } from "@/components/onboarding/onboarding-steps";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { useOnboarding } from "@/queries/use-onboarding";

export interface OnboardingFlowProps {
  /** From the invitation link, so step 3 can offer that organization first. */
  invitationId: string | null;
}

function OnboardingBody(props: OnboardingFlowProps) {
  const status = useOnboarding();
  const step = status.data?.step;

  useEffect(() => {
    if (step === "done") window.location.assign("/");
  }, [step]);

  return match(status)
    .with({ isPending: true }, () => <p className="text-muted-foreground text-sm">Loading…</p>)
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <div className="space-y-8">
        <OnboardingSteps current={data.step} />
        {match(data.step)
          .with("profile", () => <OnboardingProfileStep status={data} />)
          .with("avatar", () => <OnboardingAvatarStep status={data} />)
          .with("organization", () => (
            <OnboardingOrganizationStep status={data} invitationId={props.invitationId} />
          ))
          .with("done", () => <p className="text-muted-foreground text-sm">All set. One moment…</p>)
          .exhaustive()}
      </div>
    ))
    .otherwise(() => null);
}

export function OnboardingFlow(props: OnboardingFlowProps) {
  return (
    <Providers>
      <OnboardingBody {...props} />
    </Providers>
  );
}
