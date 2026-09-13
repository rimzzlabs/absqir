import { canGrantOwner, canManageAccess } from "@absqir/core/member-access";
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
import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import { type DataColumn, DataTable } from "@absqir/ui/data-table";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@absqir/ui/field";
import { IconAction } from "@absqir/ui/icon-action";
import { Input } from "@absqir/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@absqir/ui/popover";
import { Separator } from "@absqir/ui/separator";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { DotsThreeIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { RoleBadge, type RoleName } from "@/components/shared/role-badge";
import { RoleSelect } from "@/components/shared/role-select";
import { initialsOf } from "@/lib/avatar";
import type { InvitableRole } from "@/lib/directory-schemas";
import { useRemoveMember } from "@/mutations/use-remove-member";
import { useUpdateMemberRole } from "@/mutations/use-update-member-role";
import { useUpdatePerson } from "@/mutations/use-update-person";
import { type Member, useMembers } from "@/queries/use-members";
import { type Person, usePeople } from "@/queries/use-people";

export interface MembersTableProps {
  role: RoleName;
  currentUserId: string;
}

function asRole(role: string): RoleName {
  return match(role)
    .with("owner", "admin", "organizer", (name) => name)
    .otherwise(() => "member" as const);
}

function Identity(props: { member: Member; isSelf: boolean }) {
  const { member } = props;

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        {match(member.user.image)
          .with(P.string.minLength(1), (image) => <AvatarImage src={image} alt="" />)
          .otherwise(() => null)}
        <AvatarFallback name={member.user.name}>{initialsOf(member.user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">
          {member.user.name}
          {match(props.isSelf)
            .with(true, () => <span className="text-muted-foreground"> (you)</span>)
            .otherwise(() => null)}
        </p>
        <p className="text-muted-foreground truncate text-xs">{member.user.email}</p>
      </div>
    </div>
  );
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

  return (
    <Input
      id={props.id}
      value={draft.value}
      aria-label={`Identifier for ${props.name}`}
      placeholder="—"
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
function IdentifierCell(props: { person: Person; name: string }) {
  const draft = useIdentifierDraft(props.person);

  return (
    <div className="w-36 max-w-full">
      <IdentifierInput draft={draft} id={`identifier-${props.person.id}`} name={props.name} />
      <FormError error={draft.error} />
    </div>
  );
}

function RoleCell(props: { member: Member; canChange: boolean; canGrantOwner: boolean }) {
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
  const remove = useRemoveMember();

  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {member.user.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They lose access to this organization. Their directory entry stays, without an account
            behind it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormError error={remove.error} />
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(member.id, { onSuccess: () => props.onOpenChange(false) })}
          >
            {match(remove.isPending)
              .with(true, () => "Removing…" as const)
              .otherwise(() => "Remove" as const)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RemoveAction(props: { member: Member }) {
  const [removing, setRemoving] = useState(false);

  return (
    <>
      <IconAction
        variant="ghost"
        label={`Remove ${props.member.user.name}`}
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
function CardActions(props: {
  member: Member;
  person: Person | undefined;
  canChange: boolean;
  canGrantOwner: boolean;
}) {
  const { member, person } = props;
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
          <span className="sr-only">Identifier, role and removal for {member.user.name}</span>
        </PopoverTrigger>
        <PopoverContent align="end">
          {match(person)
            .with(P.nullish, () => null)
            .otherwise((person) => (
              <Field>
                <FieldLabel htmlFor={`card-identifier-${person.id}`}>Identifier</FieldLabel>
                <FieldContent>
                  <IdentifierInput
                    draft={draft}
                    id={`card-identifier-${person.id}`}
                    name={member.user.name}
                  />
                </FieldContent>
                <FieldDescription>Employee or member number.</FieldDescription>
                <FormError error={draft.error} />
              </Field>
            ))}

          {match(props.canChange)
            .with(true, () => (
              <>
                <Field>
                  <FieldLabel htmlFor={`card-role-${member.id}`}>Role</FieldLabel>
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
                  Remove from the organization
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

export function MembersTable(props: MembersTableProps) {
  const members = useMembers();
  const people = usePeople();
  const grantsOwner = canGrantOwner(props.role);

  // Every member is also a person. The directory row carries the identifier.
  const directory = new Map(
    A.flatMap(people.data ?? [], (person) =>
      match(person.userId)
        .with(P.string, (userId) => [[userId, person] as const])
        .otherwise(() => []),
    ),
  );

  const isSelf = (member: Member) => member.userId === props.currentUserId;
  const canChange = (member: Member) =>
    canManageAccess(props.role, { role: asRole(member.role), isSelf: isSelf(member) });

  const columns: DataColumn<Member>[] = [
    {
      key: "account",
      header: "Account",
      place: "primary",
      cell: (member) => <Identity member={member} isSelf={isSelf(member)} />,
    },
    {
      // The card carries this in the popover instead, where there is room.
      key: "identifier",
      header: "Identifier",
      place: "none",
      cell: (member) =>
        match(directory.get(member.userId))
          .with(P.nullish, () => <span className="text-muted-foreground">—</span>)
          .otherwise((person) => <IdentifierCell person={person} name={member.user.name} />),
    },
    {
      key: "role",
      header: "Role",
      cell: (member) => (
        <RoleCell member={member} canChange={canChange(member)} canGrantOwner={grantsOwner} />
      ),
      // A card states the role and holds the select in the popover, so the
      // three controls of a row arrive from one corner instead of three.
      card: (member) => <RoleBadge role={asRole(member.role)} />,
    },
    {
      key: "actions",
      place: "action",
      headClassName: "w-16",
      cellClassName: "text-right",
      cell: (member) =>
        match(canChange(member))
          .with(true, () => <RemoveAction member={member} />)
          .otherwise(() => null),
      card: (member) => (
        <CardActions
          member={member}
          person={directory.get(member.userId)}
          canChange={canChange(member)}
          canGrantOwner={grantsOwner}
        />
      ),
    },
  ];

  return match(members)
    .with({ isPending: true }, () => <Skeleton className="h-48 rounded-xl" />)
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (rows) => (
      <DataTable
        label="Members of this organization"
        columns={columns}
        rows={rows}
        getKey={(member) => member.id}
      />
    ))
    .otherwise(() => null);
}
