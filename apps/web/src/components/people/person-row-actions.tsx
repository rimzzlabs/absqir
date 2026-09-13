import { canDeleteFromDirectory, canManageAccess } from "@absqir/core/member-access";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@absqir/ui/alert-dialog";
import { Button } from "@absqir/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@absqir/ui/dropdown-menu";
import {
  DotsThreeIcon,
  GearIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  SignOutIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { match, P } from "ts-pattern";
import { PersonDialog } from "@/components/people/person-dialog";
import { FormError } from "@/components/shared/form-error";
import type { RoleName } from "@/components/shared/role-badge";
import { useInvitePerson } from "@/mutations/use-invite-person";
import { useRemoveMember } from "@/mutations/use-remove-member";
import { useRemovePerson } from "@/mutations/use-remove-person";
import type { Person } from "@/queries/use-people";

export interface PersonRowActionsProps {
  person: Person;
  viewerRole: RoleName;
  /** The row of the signed-in account. Settings owns its name and email. */
  isSelf: boolean;
}

function Trigger(props: { name: string }) {
  return (
    <DropdownMenuTrigger
      render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${props.name}`} />}
    >
      <DotsThreeIcon weight="bold" />
    </DropdownMenuTrigger>
  );
}

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  error: Error | null;
  onConfirm: () => void;
}

function Confirm(props: ConfirmProps) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription>{props.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <FormError error={props.error} />
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={props.pending}
            onClick={props.onConfirm}
          >
            {match(props.pending)
              .with(true, () => props.pendingLabel)
              .otherwise(() => props.confirmLabel)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * The signed-in account edits its own name and email on the settings page, so
 * the directory offers the way there instead of a second form for the same
 * two fields.
 */
function SelfActions(props: { person: Person }) {
  return (
    <DropdownMenu>
      <Trigger name={props.person.name} />
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<a href="/settings?tab=profile" />}>
          <GearIcon />
          Edit in settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PersonRowActions(props: PersonRowActionsProps) {
  const { person } = props;
  const [editing, setEditing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const invite = useInvitePerson();
  const removeMember = useRemoveMember();
  const removePerson = useRemovePerson();

  const subject = { role: person.role, isSelf: props.isSelf };
  const canInvite = person.email !== null && person.role === null;
  const canRevoke = person.memberId !== null && canManageAccess(props.viewerRole, subject);
  const canDelete = canDeleteFromDirectory(props.viewerRole, subject);

  if (props.isSelf) return <SelfActions person={person} />;

  return (
    <>
      <DropdownMenu>
        <Trigger name={person.name} />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <PencilSimpleIcon />
            Edit details
          </DropdownMenuItem>
          {match(canInvite)
            .with(true, () => (
              <DropdownMenuItem
                disabled={invite.isPending}
                onClick={() => invite.mutate({ id: person.id, role: "member" })}
              >
                <PaperPlaneTiltIcon />
                {match(person.invited)
                  .with(true, () => "Resend invitation" as const)
                  .otherwise(() => "Invite to sign in" as const)}
              </DropdownMenuItem>
            ))
            .otherwise(() => null)}

          {match(canRevoke || canDelete)
            .with(true, () => <DropdownMenuSeparator />)
            .otherwise(() => null)}

          {match(canRevoke)
            .with(true, () => (
              <DropdownMenuItem variant="destructive" onClick={() => setRevoking(true)}>
                <SignOutIcon />
                Revoke access
              </DropdownMenuItem>
            ))
            .otherwise(() => null)}

          {match(canDelete)
            .with(true, () => (
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                <TrashIcon />
                Delete from directory
              </DropdownMenuItem>
            ))
            .otherwise(() => null)}
        </DropdownMenuContent>
      </DropdownMenu>

      <FormError error={invite.error} />

      <PersonDialog open={editing} onOpenChange={setEditing} person={person} />

      <Confirm
        open={revoking}
        onOpenChange={setRevoking}
        title={`Revoke access for ${person.name}?`}
        description="They can no longer sign in to this organization. They stay in the directory, so their groups and their attendance history stay with them."
        confirmLabel="Revoke access"
        pendingLabel="Revoking…"
        pending={removeMember.isPending}
        error={removeMember.error}
        onConfirm={() =>
          match(person.memberId)
            .with(P.string, (memberId) =>
              removeMember.mutate(memberId, { onSuccess: () => setRevoking(false) }),
            )
            .otherwise(() => setRevoking(false))
        }
      />

      <Confirm
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${person.name} from the directory?`}
        description={match(person.role)
          .with(
            P.nonNullable,
            () =>
              "This deletes the directory entry, the account's membership, and the attendance history behind the entry. The account itself stays.",
          )
          .otherwise(
            () =>
              "This deletes the directory entry, any pending invitation, and the attendance history behind the entry." as const,
          )}
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={removePerson.isPending}
        error={removePerson.error}
        onConfirm={() => removePerson.mutate(person.id, { onSuccess: () => setDeleting(false) })}
      />
    </>
  );
}
