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
import { Input } from "@absqir/ui/input";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { TrashIcon } from "@phosphor-icons/react";
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
import { usePeople } from "@/queries/use-people";

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

/**
 * The employee or member number, from the directory row behind the account.
 * The event register, the reports, and the group picker all read it, so an
 * admin needs one place to set it. Saving happens on blur, and the refreshed
 * value remounts the field through the key.
 */
function IdentifierField(props: { personId: string; value: string | null; name: string }) {
  const [draft, setDraft] = useState(props.value ?? "");
  const save = useUpdatePerson();

  const commit = () => {
    const next = draft.trim();
    if (next === (props.value ?? "")) return;

    save.mutate({ id: props.personId, identifier: next || null });
  };

  return (
    <div className="w-36 max-w-full">
      <Input
        value={draft}
        aria-label={`Identifier for ${props.name}`}
        placeholder="—"
        autoComplete="off"
        className="font-mono text-xs"
        disabled={save.isPending}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <FormError error={save.error} />
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
          <div className="w-40">
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

function RemoveAction(props: { member: Member }) {
  const { member } = props;
  const remove = useRemoveMember();
  const [removing, setRemoving] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${member.user.name}`}
        onClick={() => setRemoving(true)}
      >
        <TrashIcon />
      </Button>
      <AlertDialog open={removing} onOpenChange={setRemoving}>
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
              onClick={() => remove.mutate(member.id, { onSuccess: () => setRemoving(false) })}
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
      key: "identifier",
      header: "Identifier",
      cell: (member) =>
        match(directory.get(member.userId))
          .with(P.nullish, () => <span className="text-muted-foreground">—</span>)
          .otherwise((person) => (
            <IdentifierField
              key={person.identifier ?? ""}
              personId={person.id}
              value={person.identifier}
              name={member.user.name}
            />
          )),
    },
    {
      key: "role",
      header: "Role",
      cell: (member) => (
        <RoleCell member={member} canChange={canChange(member)} canGrantOwner={grantsOwner} />
      ),
    },
    {
      key: "remove",
      place: "action",
      headClassName: "w-16",
      cellClassName: "text-right",
      cell: (member) =>
        match(canChange(member))
          .with(true, () => <RemoveAction member={member} />)
          .otherwise(() => null),
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
