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
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { PersonDialog } from "@/components/people/person-dialog";
import { FormError } from "@/components/shared/form-error";
import { useInvitePerson } from "@/mutations/use-invite-person";
import { useRemovePerson } from "@/mutations/use-remove-person";
import type { Person } from "@/queries/use-people";

export interface PersonRowActionsProps {
  person: Person;
}

export function PersonRowActions(props: PersonRowActionsProps) {
  const { person } = props;
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const invite = useInvitePerson();
  const remove = useRemovePerson();

  const canInvite = person.email !== null && person.role === null;
  const isOwner = person.role === "owner";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${person.name}`} />
          }
        >
          <DotsThreeIcon weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <PencilSimpleIcon />
            Edit
          </DropdownMenuItem>
          {canInvite ? (
            <DropdownMenuItem
              disabled={invite.isPending}
              onClick={() => invite.mutate({ id: person.id, role: "member" })}
            >
              <PaperPlaneTiltIcon />
              {person.invited ? "Resend invitation" : "Invite to sign in"}
            </DropdownMenuItem>
          ) : null}
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
              {person.role
                ? "This removes the directory entry and the account's membership in this organization. The account itself stays."
                : "This removes the directory entry and any pending invitation."}
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
              {remove.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
