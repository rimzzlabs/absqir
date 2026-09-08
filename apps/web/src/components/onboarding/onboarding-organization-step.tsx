import { Button } from "@absqir/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@absqir/ui/item";
import { Separator } from "@absqir/ui/separator";
import { AuthHeading } from "@/components/auth/auth-heading";
import { FormError } from "@/components/shared/form-error";
import { OrganizationForm } from "@/components/shared/organization-form";
import { roleLabel } from "@/components/shared/role-badge";
import { useOnboardingAccept } from "@/mutations/use-onboarding-accept";
import { useOnboardingFinish } from "@/mutations/use-onboarding-finish";
import { useOnboardingOrganization } from "@/mutations/use-onboarding-organization";
import type { OnboardingStatus } from "@/queries/use-onboarding";

export interface OnboardingOrganizationStepProps {
  status: OnboardingStatus;
  invitationId: string | null;
}

function asRole(role: string) {
  return role === "owner" || role === "admin" || role === "organizer" ? role : "member";
}

/**
 * Step 3 depends on how the reader arrived. An invitation joins its
 * organization. The operator, or anyone allowed, creates one. Everyone else
 * finishes and waits for an invitation.
 */
export function OnboardingOrganizationStep(props: OnboardingOrganizationStepProps) {
  const { status } = props;
  const accept = useOnboardingAccept();
  const create = useOnboardingOrganization();
  const finish = useOnboardingFinish();

  const invitations = [...status.invitations].sort((a, b) =>
    a.id === props.invitationId ? -1 : b.id === props.invitationId ? 1 : 0,
  );
  const hasInvitations = invitations.length > 0;

  return (
    <div className="space-y-6">
      <AuthHeading
        title="Join an organization"
        description={
          hasInvitations
            ? "You have been invited. Accept to get started."
            : status.canCreateOrganizations
              ? "Create the organization you will run attendance for."
              : "You need an invitation from an organizer."
        }
      />

      {hasInvitations ? (
        <ItemGroup>
          {invitations.map((invitation) => (
            <Item key={invitation.id} variant="outline">
              <ItemContent>
                <ItemTitle>{invitation.organizationName}</ItemTitle>
                <ItemDescription>Join as {roleLabel(asRole(invitation.role))}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  size="sm"
                  disabled={accept.isPending}
                  onClick={() => accept.mutate(invitation.id)}
                >
                  {accept.isPending ? "Joining…" : "Accept"}
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      ) : null}

      {status.canCreateOrganizations ? (
        <>
          {hasInvitations ? <Separator /> : null}
          <OrganizationForm
            submitLabel="Create organization"
            pending={create.isPending}
            onSubmit={(values) => create.mutate(values)}
          />
        </>
      ) : null}

      {!hasInvitations && !status.canCreateOrganizations ? (
        <p className="text-muted-foreground text-sm">
          Ask an organizer to invite {status.email}. When the invitation arrives, open its link and
          you land in the organization at once.
        </p>
      ) : null}

      <FormError error={accept.error ?? create.error ?? finish.error} />

      {!status.canCreateOrganizations || hasInvitations ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={finish.isPending}
          onClick={() => finish.mutate()}
        >
          {finish.isPending ? "Finishing…" : "Finish without joining"}
        </Button>
      ) : null}
    </div>
  );
}
