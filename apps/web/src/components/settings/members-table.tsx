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
import { Skeleton } from "@absqir/ui/skeleton";
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
import { type Member, useMembers } from "@/queries/use-members";

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
  const grantsOwner = canGrantOwner(props.role);

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
