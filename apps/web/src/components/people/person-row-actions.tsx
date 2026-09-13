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
  TrashIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { PersonDialog } from "@/components/people/person-dialog";
import { FormError } from "@/components/shared/form-error";
import { useInvitePerson } from "@/mutations/use-invite-person";
import { useRemovePerson } from "@/mutations/use-remove-person";
import type { Person } from "@/queries/use-people";

export interface PersonRowActionsProps {
  person: Person;
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
  const [removing, setRemoving] = useState(false);
  const invite = useInvitePerson();
  const remove = useRemovePerson();

  const canInvite = person.email !== null && person.role === null;
  const isOwner = person.role === "owner";

  if (props.isSelf) return <SelfActions person={person} />;

  return (
    <>
      <DropdownMenu>
        <Trigger name={person.name} />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <PencilSimpleIcon />
            Edit
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isOwner}
            onClick={() => setRemoving(true)}
          >
            <TrashIcon />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FormError error={invite.error} />

      <PersonDialog open={editing} onOpenChange={setEditing} person={person} />

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {person.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {match(person.role)
                .with(
                  P.string.minLength(1),
                  () =>
                    "This removes the directory entry and the account's membership in this organization. The account itself stays.",
                )
                .otherwise(
                  () => "This removes the directory entry and any pending invitation." as const,
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormError error={remove.error} />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(person.id, { onSuccess: () => setRemoving(false) })}
            >
              {match(remove.isPending)
                .with(true, () => "Removing…" as const)
                .otherwise(() => "Remove" as const)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
