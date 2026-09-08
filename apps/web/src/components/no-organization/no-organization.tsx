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
import { SignOutIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { OrganizationForm } from "@/components/shared/organization-form";
import { roleLabel } from "@/components/shared/role-badge";
import { useCreateOrganization } from "@/mutations/use-create-organization";
import { useOnboardingAccept } from "@/mutations/use-onboarding-accept";
import { useSignOut } from "@/mutations/use-sign-out";
import { useOnboarding } from "@/queries/use-onboarding";

function asRole(role: string) {
  return role === "owner" || role === "admin" || role === "organizer" ? role : "member";
}

/** An account that finished onboarding but belongs to no organization yet. */
function NoOrganizationBody() {
  const status = useOnboarding();
  const accept = useOnboardingAccept();
  const create = useCreateOrganization();
  const signOut = useSignOut();

  return match(status)
    .with({ isPending: true }, () => <p className="text-muted-foreground text-sm">Loading…</p>)
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (data) => {
      const hasInvitations = data.invitations.length > 0;

      return (
        <div className="space-y-6">
          <AuthHeading
            title="You are not in an organization yet"
            description={
              hasInvitations
                ? "An invitation is waiting for you."
                : data.canCreateOrganizations
                  ? "Create one, or wait for an invitation."
                  : `Ask an organizer to invite ${data.email}. The link in the email brings you in.`
            }
          />

          {hasInvitations ? (
            <ItemGroup>
              {data.invitations.map((invitation) => (
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

          {data.canCreateOrganizations ? (
            <>
              {hasInvitations ? <Separator /> : null}
              <OrganizationForm
                submitLabel="Create organization"
                pending={create.isPending}
                onSubmit={(values) => create.mutate(values)}
              />
            </>
          ) : null}

          <FormError error={accept.error ?? create.error ?? signOut.error} />

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
          >
            <SignOutIcon />
            Sign out
          </Button>
        </div>
      );
    })
    .otherwise(() => null);
}

export function NoOrganization() {
  return (
    <Providers>
      <NoOrganizationBody />
    </Providers>
  );
}
