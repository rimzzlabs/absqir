import { canGrantOwner, canManageAccess } from "@absqir/core/member-access";
import { Badge } from "@absqir/ui/badge";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { RoleBadge, type RoleName } from "@/components/shared/role-badge";
import { RoleSelect } from "@/components/shared/role-select";
import type { InvitableRole } from "@/lib/directory-schemas";
import { useUpdateMemberRole } from "@/mutations/use-update-member-role";
import type { Person } from "@/queries/use-people";

export interface PersonAccessCellProps {
  person: Person;
  viewerRole: RoleName;
  isSelf: boolean;
}

/** What a person with no account can still do: wait for an invitation, or get one. */
function InviteState(props: { person: Person }) {
  const { person } = props;

  if (person.invited) return <Badge variant="secondary">Invited</Badge>;
  if (person.email) return <Badge variant="outline">Not invited</Badge>;

  return <Badge variant="outline">No email</Badge>;
}

/**
 * One column for the whole answer to "what can this person do here". An
 * account shows its role, and the viewer changes it in place when the rules
 * allow. Everybody else shows how far along their invitation is.
 */
export function PersonAccessCell(props: PersonAccessCellProps) {
  const { person } = props;
  const updateRole = useUpdateMemberRole();

  const membership = match(person)
    .with({ role: P.nonNullable, memberId: P.string }, (row) => ({
      role: row.role,
      memberId: row.memberId,
    }))
    .otherwise(() => null);

  if (membership === null) return <InviteState person={person} />;

  const manage = canManageAccess(props.viewerRole, {
    role: membership.role,
    isSelf: props.isSelf,
  });

  if (!manage) return <RoleBadge role={membership.role} />;

  return (
    <div className="w-40 max-w-full">
      <RoleSelect
        value={membership.role as InvitableRole}
        includeOwner={canGrantOwner(props.viewerRole)}
        disabled={updateRole.isPending}
        onChange={(role) => updateRole.mutate({ memberId: membership.memberId, role })}
      />
      <FormError error={updateRole.error} />
    </div>
  );
}
