import { relativeToNow } from "@absqir/core/date";
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
import { useState } from "react";
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
  return role === "owner" || role === "admin" || role === "organizer" ? role : "member";
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

  const accept = useOnboardingAccept();
  const ask = useAskToJoin();
  const withdraw = useWithdrawJoinRequest();
  const createInOnboarding = useOnboardingOrganization();
  const createLater = useCreateOrganization();
  const create = variant === "onboarding" ? createInOnboarding : createLater;

  const [message, setMessage] = useState("");
  const [writing, setWriting] = useState(false);

  const invitations = status.invitations.toSorted((a, b) => {
    if (a.id === props.invitationId) return -1;
    if (b.id === props.invitationId) return 1;
    return 0;
  });
  const hasInvitations = invitations.length > 0;
  const hasEvent = Boolean(props.eventId);
  const workspace = status.workspace;
  const waiting = status.joinRequest;
  const requestLabel = writing ? "Send request" : "Ask to join";
  const joinLabel = workspace?.joinPolicy === "auto" ? "Join" : requestLabel;

  const heading = (() => {
    if (waiting) {
      return {
        title: "Your request is with them",
        description: `${waiting.organizationName} decides who comes in. You will hear back in absqir and by email.`,
      };
    }

    if (hasEvent) {
      return {
        title: "Join an organization",
        description: "Register for the event, and you join its organization as a member.",
      };
    }

    if (hasInvitations) {
      return {
        title: "You have been invited",
        description: "Accept to get started.",
      };
    }

    if (workspace) {
      return workspace.joinPolicy === "auto"
        ? {
            title: `${workspace.name} is on absqir`,
            description: `Everybody at ${workspace.domain} can come straight in.`,
          }
        : {
            title: `${workspace.name} is on absqir`,
            description: `They take people from ${workspace.domain}. Ask, and an organizer decides.`,
          };
    }

    return {
      title: "You are not in an organization yet",
      description: status.canCreateOrganizations
        ? "Start one below, or wait for an invitation."
        : "An organizer has to invite you.",
    };
  })();

  return (
    <div className="space-y-6">
      {props.heading === false ? null : (
        <AuthHeading title={heading.title} description={heading.description} />
      )}

      {props.eventId ? <OnboardingEventCard eventId={props.eventId} /> : null}

      {waiting ? (
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>{waiting.organizationName}</ItemTitle>
            <ItemDescription>Sent {relativeToNow(new Date(waiting.createdAt))}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              size="sm"
              variant="ghost"
              disabled={withdraw.isPending}
              onClick={() => withdraw.mutate()}
            >
              {withdraw.isPending ? "Withdrawing…" : "Withdraw"}
            </Button>
          </ItemActions>
        </Item>
      ) : null}

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

      {workspace && !waiting ? (
        <div className="space-y-3">
          <Item variant="outline">
            <ItemMedia>
              <Avatar>
                {workspace.logo ? <AvatarImage src={workspace.logo} alt="" /> : null}
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
                {ask.isPending ? "Sending…" : joinLabel}
              </Button>
            </ItemActions>
          </Item>

          {writing && workspace.joinPolicy === "request" ? (
            <Textarea
              autoFocus
              rows={3}
              maxLength={MAX_MESSAGE_LENGTH}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={`Tell ${workspace.name} who you are. This is optional.`}
              aria-label="A note for the organizers"
            />
          ) : null}
        </div>
      ) : null}

      {status.canCreateOrganizations && !waiting ? (
        <>
          {hasInvitations || workspace ? <Separator /> : null}
          <OrganizationForm
            submitLabel={workspace ? "Start a separate organization" : "Create organization"}
            pending={create.isPending}
            onSubmit={(values) => create.mutate(values)}
          />
        </>
      ) : null}

      {!hasInvitations && !workspace && !waiting && !hasEvent ? (
        <p className="text-muted-foreground text-sm">
          An invitation to {status.email} brings you straight in. Open its link and you are there.
        </p>
      ) : null}

      <FormError error={accept.error ?? ask.error ?? withdraw.error ?? create.error} />

      {props.footer}
    </div>
  );
}
