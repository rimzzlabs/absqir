import { useTranslate } from "@absqir/i18n/react";
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
  const t = useTranslate();
  const [stage, setStage] = useState<Stage>("idle");
  const remove = useDeleteOrganization();

  const stop = () => {
    setStage("idle");
    remove.reset();
  };

  if (props.role !== "owner") {
    return (
      <DangerZoneRow
        title={t("settings:organization.danger.title")}
        description={t("settings:organization.danger.ownerOnly")}
        action={
          <Button type="button" variant="outline" disabled>
            {t("common:actions.delete")}
          </Button>
        }
      />
    );
  }

  return (
    <>
      <DangerZoneRow
        title={t("settings:organization.danger.title")}
        description={t("settings:organization.danger.description")}
        action={
          <Button type="button" variant="destructive" onClick={() => setStage("phrase")}>
            {t("settings:organization.danger.button")}
          </Button>
        }
      />

      <ConfirmPhraseDialog
        open={stage === "phrase"}
        onOpenChange={(open) => {
          if (!open) stop();
        }}
        title={t("settings:organization.danger.confirmTitle", { name: props.organization.name })}
        description={t("settings:organization.danger.confirmDescription")}
        phrase={props.organization.slug}
        phraseLabel={t("settings:organization.danger.phraseLabel")}
        confirmLabel={t("settings:organization.danger.continue")}
        onConfirm={() => setStage("final")}
      />

      <FinalWordDialog
        open={stage === "final"}
        onOpenChange={(open) => {
          if (!open) stop();
        }}
        title={t("settings:organization.danger.lastWord")}
        description={t("settings:organization.danger.lastWordDescription", {
          name: props.organization.name,
        })}
        confirmLabel={t("settings:organization.danger.deleteForever")}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(props.organization.id)}
      >
        <p>{t("settings:organization.danger.losing")}</p>
        <p>{t("settings:organization.danger.keeping")}</p>
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
