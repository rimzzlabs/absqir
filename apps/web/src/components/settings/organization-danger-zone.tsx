import { Button } from "@absqir/ui/button";
import { useState } from "react";
import { ConfirmPhraseDialog } from "@/components/shared/confirm-phrase-dialog";
import { DangerZone, DangerZoneRow } from "@/components/shared/danger-zone";
import { FinalWordDialog } from "@/components/shared/final-word-dialog";
import { LeaveOrganizationRow } from "@/components/shared/leave-organization-row";
import type { RoleName } from "@/components/shared/role-badge";
import { useDeleteOrganization } from "@/mutations/use-delete-organization";

export interface OrganizationDangerZoneProps {
  role: RoleName;
  organization: { id: string; name: string; slug: string };
}

type Stage = "idle" | "phrase" | "final";

function DeleteOrganizationRow(props: OrganizationDangerZoneProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const remove = useDeleteOrganization();

  const stop = () => {
    setStage("idle");
    remove.reset();
  };

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
          <Button type="button" variant="destructive" onClick={() => setStage("phrase")}>
            Delete organization
          </Button>
        }
      />

      <ConfirmPhraseDialog
        open={stage === "phrase"}
        onOpenChange={(open) => {
          if (!open) stop();
        }}
        title={`Delete ${props.organization.name}?`}
        description="Copy the slug below to go on."
        phrase={props.organization.slug}
        phraseLabel="organization slug"
        confirmLabel="Continue"
        onConfirm={() => setStage("final")}
      />

      <FinalWordDialog
        open={stage === "final"}
        onOpenChange={(open) => {
          if (!open) stop();
        }}
        title="Last word"
        description={`Press the button and ${props.organization.name} is gone. Nobody can bring it back.`}
        confirmLabel="Delete forever"
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(props.organization.id)}
      >
        <p>
          The directory, the groups, the events, and every attendance record are erased. No report
          of a past event survives.
        </p>
        <p>The members keep their accounts, and land in the waiting room.</p>
      </FinalWordDialog>
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
