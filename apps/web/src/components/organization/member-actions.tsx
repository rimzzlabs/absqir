import { useTranslate } from "@absqir/i18n/react";
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
  DropdownMenuTrigger,
} from "@absqir/ui/dropdown-menu";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@absqir/ui/field";
import { IconAction } from "@absqir/ui/icon-action";
import { Input } from "@absqir/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@absqir/ui/popover";
import { Separator } from "@absqir/ui/separator";
import { DotsThreeIcon, PaperPlaneTiltIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { RoleBadge, type RoleName } from "@/components/shared/role-badge";
import { RoleSelect } from "@/components/shared/role-select";
import type { InvitableRole } from "@/lib/directory-schemas";
import { useCancelInvitation } from "@/mutations/use-cancel-invitation";
import { useInviteMember } from "@/mutations/use-invite-member";
import { useRemoveMember } from "@/mutations/use-remove-member";
import { useUpdateMemberRole } from "@/mutations/use-update-member-role";
import { useUpdatePerson } from "@/mutations/use-update-person";
import type { Invitation, Member } from "@/queries/use-members";
import type { Person } from "@/queries/use-people";

export function asRole(role: string): RoleName {
  return match(role)
    .with("owner", "admin", "organizer", (name) => name)
    .otherwise(() => "member" as const);
}

/** The roles an invitation can carry back into the select. */
function asInvitableRole(role: string): InvitableRole {
  return match(role)
    .with("admin", "organizer", (name) => name)
    .otherwise(() => "member" as const);
}

interface IdentifierDraft {
  value: string;
  set: (value: string) => void;
  commit: () => void;
  pending: boolean;
  error: Error | null;
}

/**
 * The employee or member number, from the directory row behind the account.
 * The event register, the reports, and the group picker all read it, so an
 * admin needs one place to set it.
 *
 * The draft sits here rather than in the input, because the popover on a card
 * has to save before it closes. A press outside unmounts the input, and an
 * unmounted input never fires blur.
 */
function useIdentifierDraft(person: Person | undefined): IdentifierDraft {
  const stored = person?.identifier ?? "";
  const [value, set] = useState(stored);
  const [seen, setSeen] = useState(stored);
  const save = useUpdatePerson();

  // A save, or a refetch, replaces the draft the reader has not touched.
  if (stored !== seen) {
    setSeen(stored);
    set(stored);
  }

  const commit = () => {
    const next = value.trim();
    if (!person || next === stored) return;

    save.mutate({ id: person.id, identifier: next || null });
  };

  return { value, set, commit, pending: save.isPending, error: save.error };
}

function IdentifierInput(props: { draft: IdentifierDraft; id: string; name: string }) {
  const { draft } = props;
  const t = useTranslate();

  return (
    <Input
      id={props.id}
      value={draft.value}
      aria-label={t("organization:members.identifierFor", { name: props.name })}
      placeholder={t("organization:members.identifierPlaceholder")}
      autoComplete="off"
      className="font-mono text-xs"
      disabled={draft.pending}
      onChange={(event) => draft.set(event.target.value)}
      onBlur={draft.commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

/** The table cell. A card folds the same field into the popover below. */
export function IdentifierCell(props: { person: Person; name: string }) {
  const draft = useIdentifierDraft(props.person);

  return (
    <div className="w-36 max-w-full">
      <IdentifierInput draft={draft} id={`identifier-${props.person.id}`} name={props.name} />
      <FormError error={draft.error} />
    </div>
  );
}

export function RoleCell(props: { member: Member; canChange: boolean; canGrantOwner: boolean }) {
  const { member } = props;
  const role = asRole(member.role);
  const updateRole = useUpdateMemberRole();

  return (
    <>
      {match(props.canChange)
        .with(true, () => (
          <div className="w-40 max-w-full">
            <RoleSelect
              value={role as InvitableRole}
              includeOwner={props.canGrantOwner}
              disabled={updateRole.isPending}
              onChange={(value) => updateRole.mutate({ memberId: member.id, role: value })}
            />
          </div>
        ))
        .otherwise(() => (
          <RoleBadge role={role} />
        ))}
      <FormError error={updateRole.error} />
    </>
  );
}

function RemoveDialog(props: {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { member } = props;
  const t = useTranslate();
  const remove = useRemoveMember();

  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("organization:members.removeTitle", { name: member.user.name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("organization:members.removeDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormError error={remove.error} />
        <AlertDialogFooter>
          <AlertDialogCancel>{t("organization:members.keep")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(member.id, { onSuccess: () => props.onOpenChange(false) })}
          >
            {match(remove.isPending)
              .with(true, () => t("organization:members.removing"))
              .otherwise(() => t("organization:members.remove"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RemoveAction(props: { member: Member }) {
  const t = useTranslate();
  const [removing, setRemoving] = useState(false);

  return (
    <>
      <IconAction
        variant="ghost"
        label={t("organization:members.removeLabel", { name: props.member.user.name })}
        onClick={() => setRemoving(true)}
      >
        <TrashIcon />
      </IconAction>
      <RemoveDialog member={props.member} open={removing} onOpenChange={setRemoving} />
    </>
  );
}

/**
 * A card has one corner for actions, not a row of controls. The identifier
 * field and the remove button fold into a popover there, so the card stays a
 * name, an email, and a role.
 */
export function MemberCardActions(props: {
  member: Member;
  person: Person | undefined;
  canChange: boolean;
  canGrantOwner: boolean;
}) {
  const { member, person } = props;
  const t = useTranslate();
  const [removing, setRemoving] = useState(false);
  const draft = useIdentifierDraft(person);
  const updateRole = useUpdateMemberRole();

  if (!person && !props.canChange) return null;

  return (
    <>
      <Popover
        onOpenChange={(open) => {
          if (!open) draft.commit();
        }}
      >
        <PopoverTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <DotsThreeIcon weight="bold" />
          <span className="sr-only">
            {t("organization:members.cardActions", { name: member.user.name })}
          </span>
        </PopoverTrigger>
        <PopoverContent align="end">
          {match(person)
            .with(P.nullish, () => null)
            .otherwise((person) => (
              <Field>
                <FieldLabel htmlFor={`card-identifier-${person.id}`}>
                  {t("organization:members.identifier")}
                </FieldLabel>
                <FieldContent>
                  <IdentifierInput
                    draft={draft}
                    id={`card-identifier-${person.id}`}
                    name={member.user.name}
                  />
                </FieldContent>
                <FieldDescription>{t("organization:members.identifierHint")}</FieldDescription>
                <FormError error={draft.error} />
              </Field>
            ))}

          {match(props.canChange)
            .with(true, () => (
              <>
                <Field>
                  <FieldLabel htmlFor={`card-role-${member.id}`}>
                    {t("organization:members.role")}
                  </FieldLabel>
                  <FieldContent>
                    <RoleSelect
                      id={`card-role-${member.id}`}
                      value={asRole(member.role) as InvitableRole}
                      includeOwner={props.canGrantOwner}
                      disabled={updateRole.isPending}
                      onChange={(role) => updateRole.mutate({ memberId: member.id, role })}
                    />
                  </FieldContent>
                  <FormError error={updateRole.error} />
                </Field>

                <Separator />

                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setRemoving(true)}
                >
                  <TrashIcon />
                  {t("organization:members.removeFromOrganization")}
                </Button>
              </>
            ))
            .otherwise(() => null)}
        </PopoverContent>
      </Popover>

      <RemoveDialog member={member} open={removing} onOpenChange={setRemoving} />
    </>
  );
}

/**
 * A cancel kills the link in the email, and no undo brings it back, so the
 * reader states the intent twice. The mutation lives here, the same way the
 * remove dialog owns its own, so a failure shows next to the button that
 * caused it.
 */
function CancelInvitationDialog(props: {
  invitation: Invitation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { invitation } = props;
  const t = useTranslate();
  const cancel = useCancelInvitation();

  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("organization:invitations.cancelTitle", { email: invitation.email })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("organization:invitations.cancelDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormError error={cancel.error} />
        <AlertDialogFooter>
          <AlertDialogCancel>{t("organization:invitations.keep")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={cancel.isPending}
            onClick={() =>
              cancel.mutate(invitation.id, { onSuccess: () => props.onOpenChange(false) })
            }
          >
            {match(cancel.isPending)
              .with(true, () => t("organization:invitations.cancelling"))
              .otherwise(() => t("organization:invitations.cancelConfirm"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Send again, or drop it. `useInviteMember` already asks for a resend, so the
 * same call refreshes the link instead of refusing a duplicate. Each row owns
 * its mutation, so one pending request does not grey out the whole list.
 *
 * Both actions arrive from one corner, the way the controls of a member card
 * do. A resend moves the expiry on the row back to seven days, so the list
 * itself reports the result.
 */
export function InvitationActions(props: { invitation: Invitation }) {
  const { invitation } = props;
  const t = useTranslate();
  const resend = useInviteMember();
  const [cancelling, setCancelling] = useState(false);

  return (
    // A failed resend prints under the button. In a row the actions column is
    // narrow, so a message beside the button would squeeze it to one word.
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <DotsThreeIcon weight="bold" />
          <span className="sr-only">
            {t("organization:invitations.actions", { email: invitation.email })}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={resend.isPending}
            onClick={() =>
              resend.mutate({ email: invitation.email, role: asInvitableRole(invitation.role) })
            }
          >
            <PaperPlaneTiltIcon />
            {t("organization:invitations.resend")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setCancelling(true)}>
            <XIcon />
            {t("organization:invitations.cancel")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelInvitationDialog
        invitation={invitation}
        open={cancelling}
        onOpenChange={setCancelling}
      />
      <FormError error={resend.error} />
    </div>
  );
}
