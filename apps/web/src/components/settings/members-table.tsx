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
import { Skeleton } from "@absqir/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@absqir/ui/table";
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
  return role === "owner" || role === "admin" || role === "organizer" ? role : "member";
}

function MemberRow(props: { member: Member; viewerRole: RoleName; isSelf: boolean }) {
  const { member } = props;
  const role = asRole(member.role);
  const updateRole = useUpdateMemberRole();
  const remove = useRemoveMember();
  const [removing, setRemoving] = useState(false);

  const viewerIsOwner = props.viewerRole === "owner";
  const viewerIsAdmin = viewerIsOwner || props.viewerRole === "admin";
  // Admins manage everyone below owner. Owners manage everyone but themselves.
  const canChange = !props.isSelf && (viewerIsOwner || (viewerIsAdmin && role !== "owner"));

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            {member.user.image ? <AvatarImage src={member.user.image} alt="" /> : null}
            <AvatarFallback>{initialsOf(member.user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {member.user.name}
              {props.isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
            </p>
            <p className="text-muted-foreground text-xs">{member.user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {canChange ? (
          <div className="w-40">
            <RoleSelect
              value={role as InvitableRole}
              includeOwner={viewerIsOwner}
              disabled={updateRole.isPending}
              onChange={(value) => updateRole.mutate({ memberId: member.id, role: value })}
            />
          </div>
        ) : (
          <RoleBadge role={role} />
        )}
        <FormError error={updateRole.error} />
      </TableCell>
      <TableCell className="text-right">
        {canChange ? (
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
                    They lose access to this organization. Their directory entry stays, without an
                    account behind it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <FormError error={remove.error} />
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(member.id, { onSuccess: () => setRemoving(false) })
                    }
                  >
                    {remove.isPending ? "Removing…" : "Remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function MembersTable(props: MembersTableProps) {
  const members = useMembers();

  return match(members)
    .with({ isPending: true }, () => <Skeleton className="h-48 rounded-xl" />)
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (rows) => (
      <div className="border-border overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                viewerRole={props.role}
                isSelf={member.userId === props.currentUserId}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    ))
    .otherwise(() => null);
}
