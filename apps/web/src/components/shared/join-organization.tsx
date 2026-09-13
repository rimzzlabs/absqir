import { relativeToNow } from "@absqir/core/date";
import { useTranslate } from "@absqir/i18n/react";
import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@absqir/ui/item";
import { Separator } from "@absqir/ui/separator";
import { Textarea } from "@absqir/ui/textarea";
import { A } from "@mobily/ts-belt";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { OnboardingEventCard } from "@/components/onboarding/onboarding-event-card";
import { FormError } from "@/components/shared/form-error";
import { OrganizationForm } from "@/components/shared/organization-form";
import { roleLabel } from "@/components/shared/role-badge";
import { useAskToJoin } from "@/mutations/use-ask-to-join";
import { useCreateOrganization } from "@/mutations/use-create-organization";
import { useOnboardingAccept } from "@/mutations/use-onboarding-accept";
import { useOnboardingOrganization } from "@/mutations/use-onboarding-organization";
import { useWithdrawJoinRequest } from "@/mutations/use-withdraw-join-request";
import type { OnboardingStatus } from "@/queries/use-onboarding";

const MAX_MESSAGE_LENGTH = 500;

export interface JoinOrganizationProps {
  status: OnboardingStatus;
  /**
   * `onboarding` is the last step of a new account and creates its first
   * organization through the onboarding route. `waiting` is the room an
   * account sits in when it belongs to none.
   */
  variant: "onboarding" | "waiting";
  /** The invitation the reader followed, sorted to the top. */
  invitationId?: string | null;
  /** The open event whose public page sent the reader here. */
  eventId?: string | null;
  /**
   * Off when the surface around it already says where the reader is, such as
   * one step inside the getting-started card.
   */
  heading?: boolean;
  /** The way out of this screen: finish onboarding, or sign out. */
  footer?: React.ReactNode;
}

function asRole(role: string) {
  return match(role)
    .with("owner", "admin", "organizer", (name) => name)
    .otherwise(() => "member" as const);
}

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}

/**
 * Every way into an organization, in one place: an invitation, the workspace
 * that claimed the email domain, or a new organization. Onboarding and the
 * waiting room both render it, so the two never drift apart.
 */
export function JoinOrganization(props: JoinOrganizationProps) {
  const { status, variant } = props;
  const t = useTranslate();

  const accept = useOnboardingAccept();
  const ask = useAskToJoin();
  const withdraw = useWithdrawJoinRequest();
  const createInOnboarding = useOnboardingOrganization();
  const createLater = useCreateOrganization();
  const create = match(variant)
    .with("onboarding", () => createInOnboarding)
    .otherwise(() => createLater);

  const [message, setMessage] = useState("");
  const [writing, setWriting] = useState(false);

  const invitations = A.sort(status.invitations, (a, b) => {
    if (a.id === props.invitationId) return -1;
    if (b.id === props.invitationId) return 1;
    return 0;
  });
  const hasInvitations = invitations.length > 0;
  const hasEvent = Boolean(props.eventId);
  const workspace = status.workspace;
  const waiting = status.joinRequest;
  const requestLabel = match(writing)
    .with(true, () => t("join:workspace.send"))
    .otherwise(() => t("join:workspace.ask"));
  const joinLabel = match(workspace)
    .with({ joinPolicy: "auto" }, () => t("join:workspace.join"))
    .otherwise(() => requestLabel);

  const heading = (() => {
    if (waiting) {
      return {
        title: t("join:waiting.title"),
        description: t("join:waiting.description", { name: waiting.organizationName }),
      };
    }

    if (hasEvent) {
      return { title: t("join:event.title"), description: t("join:event.description") };
    }

    if (hasInvitations) {
      return { title: t("join:invited.title"), description: t("join:invited.description") };
    }

    if (workspace) {
      return {
        title: t("join:workspace.title", { name: workspace.name }),
        description: match(workspace.joinPolicy)
          .with("auto", () => t("join:workspace.autoDescription", { domain: workspace.domain }))
          .otherwise(() => t("join:workspace.requestDescription", { domain: workspace.domain })),
      };
    }

    return {
      title: t("join:none.title"),
      description: match(status.canCreateOrganizations)
        .with(true, () => t("join:none.canCreate"))
        .otherwise(() => t("join:none.cannotCreate")),
    };
  })();

  return (
    <div className="space-y-6">
      {match(props.heading === false)
        .with(true, () => null)
        .otherwise(() => (
          <AuthHeading title={heading.title} description={heading.description} />
        ))}

      {match(props.eventId)
        .with(P.string.minLength(1), (eventId) => <OnboardingEventCard eventId={eventId} />)
        .otherwise(() => null)}

      {match(waiting)
        .with(P.nullish, () => null)
        .otherwise((waiting) => (
          <Item variant="outline">
            <ItemContent>
              <ItemTitle>{waiting.organizationName}</ItemTitle>
              <ItemDescription>
                {t("join:waiting.sent", { when: relativeToNow(new Date(waiting.createdAt)) })}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                size="sm"
                variant="ghost"
                disabled={withdraw.isPending}
                onClick={() => withdraw.mutate()}
              >
                {match(withdraw.isPending)
                  .with(true, () => t("join:waiting.withdrawing"))
                  .otherwise(() => t("join:waiting.withdraw"))}
              </Button>
            </ItemActions>
          </Item>
        ))}

      {match(hasInvitations)
        .with(true, () => (
          <ItemGroup>
            {A.map(invitations, (invitation) => (
              <Item key={invitation.id} variant="outline">
                <ItemContent>
                  <ItemTitle>{invitation.organizationName}</ItemTitle>
                  <ItemDescription>
                    {t("join:invited.joinAs", { role: roleLabel(t, asRole(invitation.role)) })}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    size="sm"
                    disabled={accept.isPending}
                    onClick={() => accept.mutate(invitation.id)}
                  >
                    {match(accept.isPending)
                      .with(true, () => t("join:invited.joining"))
                      .otherwise(() => t("join:invited.accept"))}
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        ))
        .otherwise(() => null)}

      {match({ workspace, waiting })
        .with({ workspace: P.nonNullable, waiting: P.nullish }, ({ workspace }) => (
          <div className="space-y-3">
            <Item variant="outline">
              <ItemMedia>
                <Avatar>
                  {match(workspace.logo)
                    .with(P.string.minLength(1), (logo) => <AvatarImage src={logo} alt="" />)
                    .otherwise(() => null)}
                  <AvatarFallback>{initialsOf(workspace.name)}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{workspace.name}</ItemTitle>
                <ItemDescription>{workspace.domain}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  size="sm"
                  disabled={ask.isPending}
                  onClick={() => {
                    if (workspace.joinPolicy === "request" && !writing) {
                      setWriting(true);
                      return;
                    }

                    ask.mutate({ message: message.trim() || undefined });
                  }}
                >
                  {match(ask.isPending)
                    .with(true, () => t("join:workspace.sending"))
                    .otherwise(() => joinLabel)}
                </Button>
              </ItemActions>
            </Item>

            {match(writing && workspace.joinPolicy === "request")
              .with(true, () => (
                <Textarea
                  autoFocus
                  rows={3}
                  maxLength={MAX_MESSAGE_LENGTH}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t("join:workspace.notePlaceholder", { name: workspace.name })}
                  aria-label={t("join:workspace.noteLabel")}
                />
              ))
              .otherwise(() => null)}
          </div>
        ))
        .otherwise(() => null)}

      {match(status.canCreateOrganizations && !waiting)
        .with(true, () => (
          <>
            {match(Boolean(hasInvitations || workspace))
              .with(true, () => <Separator />)
              .otherwise(() => null)}
            <OrganizationForm
              submitLabel={match(workspace)
                .with(P.nullish, () => t("join:create"))
                .otherwise(() => t("join:createSeparate"))}
              pending={create.isPending}
              onSubmit={(values) => create.mutate(values)}
            />
          </>
        ))
        .otherwise(() => null)}

      {match(!hasInvitations && !workspace && !waiting && !hasEvent)
        .with(true, () => (
          <p className="text-muted-foreground text-sm">
            {t("join:invitationHint", { email: status.email })}
          </p>
        ))
        .otherwise(() => null)}

      <FormError error={accept.error ?? ask.error ?? withdraw.error ?? create.error} />

      {props.footer}
    </div>
  );
}
