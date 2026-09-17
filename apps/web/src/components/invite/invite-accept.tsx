import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button, buttonVariants } from "@absqir/ui/button";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { QueryError } from "@/components/shared/query-error";
import { roleLabel } from "@/components/shared/role-badge";
import { useOnboardingAccept } from "@/mutations/use-onboarding-accept";
import { useInvitation } from "@/queries/use-members";

export interface InviteAcceptProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  invitationId: string;
  /** Null when the reader is signed out. */
  userEmail: string | null;
}

function asRole(role: string | undefined) {
  return match(role)
    .with("owner", "admin", "organizer", (name) => name)
    .otherwise(() => "member" as const);
}

function SignedOut(props: { invitationId: string }) {
  const t = useTranslate();
  const next = encodeURIComponent(`/invite/${props.invitationId}`);

  return (
    <div className="space-y-5">
      <AuthHeading
        title={t("invite:accept.signedOutTitle")}
        description={t("invite:accept.signedOutDescription")}
      />
      <a href={`/sign-in?next=${next}`} className={buttonVariants({ className: "w-full" })}>
        {t("invite:accept.continue")}
      </a>
    </div>
  );
}

function SignedIn(props: InviteAcceptProps) {
  const t = useTranslate();
  const invitation = useInvitation(props.invitationId);
  const accept = useOnboardingAccept();

  return match(invitation)
    .with({ isPending: true }, () => (
      <p className="text-muted-foreground text-sm">{t("common:actions.loading")}</p>
    ))
    .with({ isError: true }, () => (
      <div className="space-y-5">
        <AuthHeading
          title={t("invite:accept.brokenTitle")}
          description={t("invite:accept.brokenDescription")}
        />
        <QueryError query={invitation} />
        <p className="text-muted-foreground text-sm">
          {t("invite:accept.signedInAs", { email: props.userEmail ?? "" })}
        </p>
        <a href="/" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          {t("invite:accept.dashboard")}
        </a>
      </div>
    ))
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <div className="space-y-5">
        <AuthHeading
          title={t("invite:accept.title", { organization: data.organizationName })}
          description={t("invite:accept.description", {
            inviter: data.inviterEmail,
            role: roleLabel(t, asRole(data.role)),
          })}
        />
        <FormError error={accept.error} />
        <Button
          className="w-full"
          disabled={accept.isPending}
          onClick={() => accept.mutate(props.invitationId)}
        >
          {match(accept.isPending)
            .with(true, () => t("invite:accept.joining"))
            .otherwise(() => t("invite:accept.accept"))}
        </Button>
        <a href="/" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
          {t("common:actions.notNow")}
        </a>
      </div>
    ))
    .otherwise(() => null);
}

export function InviteAccept(props: InviteAcceptProps) {
  // No slug: an invitation, read before the reader joins anything.
  return (
    <Providers locale={props.locale} orgSlug={null}>
      {match(props.userEmail)
        .with(P.string.minLength(1), () => <SignedIn {...props} />)
        .otherwise(() => (
          <SignedOut invitationId={props.invitationId} />
        ))}
    </Providers>
  );
}
