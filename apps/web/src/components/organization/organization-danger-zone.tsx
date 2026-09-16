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
        title={t("organization:general.danger.title")}
        description={t("organization:general.danger.ownerOnly")}
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
        title={t("organization:general.danger.title")}
        description={t("organization:general.danger.description")}
        action={
          <Button type="button" variant="destructive" onClick={() => setStage("phrase")}>
            {t("organization:general.danger.button")}
          </Button>
        }
      />

      <ConfirmPhraseDialog
        open={stage === "phrase"}
        onOpenChange={(open) => {
          if (!open) stop();
        }}
        title={t("organization:general.danger.confirmTitle", { name: props.organization.name })}
        description={t("organization:general.danger.confirmDescription")}
        phrase={props.organization.slug}
        phraseLabel={t("organization:general.danger.phraseLabel")}
        confirmLabel={t("organization:general.danger.continue")}
        onConfirm={() => setStage("final")}
      />

      <FinalWordDialog
        open={stage === "final"}
        onOpenChange={(open) => {
          if (!open) stop();
        }}
        title={t("organization:general.danger.lastWord")}
        description={t("organization:general.danger.lastWordDescription", {
          name: props.organization.name,
        })}
        confirmLabel={t("organization:general.danger.deleteForever")}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(props.organization.id)}
      >
        <p>{t("organization:general.danger.losing")}</p>
        <p>{t("organization:general.danger.keeping")}</p>
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
