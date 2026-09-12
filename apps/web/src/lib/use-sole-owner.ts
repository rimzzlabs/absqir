import { A } from "@mobily/ts-belt";
import type { RoleName } from "@/components/shared/role-badge";
import { useMembers } from "@/queries/use-members";

export interface SoleOwner {
  /** True while the account holds the only owner seat in the organization. */
  isSoleOwner: boolean;
  /** True while somebody else is still a member. Null until the list answers. */
  othersPresent: boolean | null;
  /** True until the member list answers, so a button can wait. */
  checking: boolean;
}

/**
 * An organization with no owner can never be administered again, so the last
 * owner of a populated one may neither leave nor delete their account. Only
 * an owner triggers the member list; every other role already knows.
 */
export function useSoleOwner(role: RoleName | null): SoleOwner {
  const isOwner = role === "owner";
  const members = useMembers({ enabled: isOwner });

  if (!isOwner) return { isSoleOwner: false, othersPresent: null, checking: false };

  if (!members.data) {
    return { isSoleOwner: false, othersPresent: null, checking: members.isPending };
  }

  const owners = A.filter(members.data, (row) => row.role === "owner");

  return {
    isSoleOwner: owners.length <= 1,
    othersPresent: members.data.length > 1,
    checking: false,
  };
}
