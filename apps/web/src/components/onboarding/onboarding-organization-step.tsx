import { Button } from "@absqir/ui/button";
import { FormError } from "@/components/shared/form-error";
import { JoinOrganization } from "@/components/shared/join-organization";
import { useOnboardingFinish } from "@/mutations/use-onboarding-finish";
import type { OnboardingStatus } from "@/queries/use-onboarding";

export interface OnboardingOrganizationStepProps {
  status: OnboardingStatus;
  invitationId: string | null;
  eventId: string | null;
}

/**
 * Step 3 depends on how the reader arrived: an invitation, the workspace that
 * claimed their email domain, an open event, or a new organization. Whatever
 * they pick, they can also finish and decide later.
 */
export function OnboardingOrganizationStep(props: OnboardingOrganizationStepProps) {
  const finish = useOnboardingFinish();

  return (
    <JoinOrganization
      status={props.status}
      variant="onboarding"
      invitationId={props.invitationId}
      eventId={props.eventId}
      footer={
        <>
          <FormError error={finish.error} />
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={finish.isPending}
            onClick={() => finish.mutate()}
          >
            {finish.isPending ? "Finishing…" : "Finish without joining"}
          </Button>
        </>
      }
    />
  );
}
