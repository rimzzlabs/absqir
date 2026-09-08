import { Button, buttonVariants } from "@absqir/ui/button";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { roleLabel } from "@/components/shared/role-badge";
import { useOnboardingAccept } from "@/mutations/use-onboarding-accept";
import { useInvitation } from "@/queries/use-members";

export interface InviteAcceptProps {
  invitationId: string;
  /** Null when the reader is signed out. */
  userEmail: string | null;
}

function asRole(role: string | undefined) {
  return role === "owner" || role === "admin" || role === "organizer" ? role : "member";
}

function SignedOut(props: { invitationId: string }) {
  const next = encodeURIComponent(`/invite/${props.invitationId}`);

  return (
    <div className="space-y-5">
      <AuthHeading
        title="You have an invitation"
        description="Sign in, or create your account, and the invitation opens again on the other side."
      />
      <a href={`/sign-in?next=${next}`} className={buttonVariants({ className: "w-full" })}>
        Continue
      </a>
    </div>
  );
}

function SignedIn(props: InviteAcceptProps) {
  const invitation = useInvitation(props.invitationId);
  const accept = useOnboardingAccept();

  return match(invitation)
    .with({ isPending: true }, () => <p className="text-muted-foreground text-sm">Loading…</p>)
    .with({ isError: true, error: P.select() }, (error) => (
      <div className="space-y-5">
        <AuthHeading
          title="This invitation cannot be opened"
          description="It expired, it was cancelled, or it was sent to another email address."
        />
        <FormError error={error} />
        <p className="text-muted-foreground text-sm">You are signed in as {props.userEmail}.</p>
        <a href="/" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          Go to the dashboard
        </a>
      </div>
    ))
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <div className="space-y-5">
        <AuthHeading
          title={`Join ${data.organizationName}`}
          description={`${data.inviterEmail} invited you as ${roleLabel(asRole(data.role))}.`}
        />
        <FormError error={accept.error} />
        <Button
          className="w-full"
          disabled={accept.isPending}
          onClick={() => accept.mutate(props.invitationId)}
        >
          {accept.isPending ? "Joining…" : "Accept the invitation"}
        </Button>
        <a href="/" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
          Not now
        </a>
      </div>
    ))
    .otherwise(() => null);
}

export function InviteAccept(props: InviteAcceptProps) {
  return (
    <Providers>
      {props.userEmail ? <SignedIn {...props} /> : <SignedOut invitationId={props.invitationId} />}
    </Providers>
  );
}
