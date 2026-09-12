import { Button } from "@absqir/ui/button";
import { useState } from "react";
import { ConfirmPhraseDialog } from "@/components/shared/confirm-phrase-dialog";
import { DangerZone, DangerZoneRow } from "@/components/shared/danger-zone";
import { LeaveOrganizationRow } from "@/components/shared/leave-organization-row";
import type { RoleName } from "@/components/shared/role-badge";
import { useDeleteOrganization } from "@/mutations/use-delete-organization";

export interface OrganizationDangerZoneProps {
  role: RoleName;
  organization: { id: string; name: string; slug: string };
}

function DeleteOrganizationRow(props: OrganizationDangerZoneProps) {
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteOrganization();

  if (props.role !== "owner") {
    return (
      <DangerZoneRow
        title="Delete this organization"
        description="Only an owner can delete the organization."
        action={
          <Button type="button" variant="outline" disabled>
            Delete
          </Button>
        }
      />
    );
  }

  return (
    <>
      <DangerZoneRow
        title="Delete this organization"
        description="The directory, the groups, the events, and every attendance record go with it. Members keep their accounts and land in the waiting room."
        action={
          <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
            Delete organization
          </Button>
        }
      />
      <ConfirmPhraseDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${props.organization.name}?`}
        description="Every event and every attendance record is erased. Nobody can bring them back."
        phrase={props.organization.slug}
        phraseLabel="organization slug"
        confirmLabel="Delete forever"
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(props.organization.id)}
      />
    </>
  );
}

/** Leaving, and deleting. Both sit under the same red frame. */
export function OrganizationDangerZone(props: OrganizationDangerZoneProps) {
  return (
    <DangerZone>
      <LeaveOrganizationRow role={props.role} organization={props.organization} />
      <DeleteOrganizationRow {...props} />
    </DangerZone>
  );
}
