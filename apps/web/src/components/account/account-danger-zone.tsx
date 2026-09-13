import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { useId, useState } from "react";
import { match, P } from "ts-pattern";
import { ConfirmPhraseDialog } from "@/components/shared/confirm-phrase-dialog";
import { DangerZone, DangerZoneRow } from "@/components/shared/danger-zone";
import { FinalWordDialog } from "@/components/shared/final-word-dialog";
import { LeaveOrganizationRow } from "@/components/shared/leave-organization-row";
import type { RoleName } from "@/components/shared/role-badge";
import { useSoleOwner } from "@/lib/use-sole-owner";
import { useDeleteAccount } from "@/mutations/use-delete-account";
import { useCredentials } from "@/queries/use-credentials";

export interface AccountDangerZoneProps {
  /** Null while the account belongs to no organization. */
  role: RoleName | null;
  organization: { id: string; name: string; slug: string } | null;
}

type Stage = "idle" | "phrase" | "final";

function DeleteAccountRow(props: AccountDangerZoneProps) {
  const t = useTranslate();
  const [stage, setStage] = useState<Stage>("idle");
  const [password, setPassword] = useState("");
  const passwordId = useId();

  const remove = useDeleteAccount();
  const credentials = useCredentials();
  const owner = useSoleOwner(props.role);

  const hasPassword = credentials.data?.hasPassword ?? false;
  const blocked = owner.isSoleOwner && owner.othersPresent === true;

  // Short enough to type once, and impossible to press by accident.
  const phrase = t("account:danger.phrase");
  const description = match(blocked)
    .with(true, () =>
      t("account:danger.soleOwner", {
        organization: props.organization?.name ?? t("account:danger.yourOrganization"),
      }),
    )
    .otherwise(() => t("account:danger.deleteDescription"));

  const stop = () => {
    setStage("idle");
    setPassword("");
    remove.reset();
  };

  return (
    <>
      <DangerZoneRow
        title={t("account:danger.deleteTitle")}
        description={description}
        action={
          <Button
            type="button"
            variant="destructive"
            disabled={blocked || owner.checking}
            onClick={() => setStage("phrase")}
          >
            {t("account:danger.deleteButton")}
          </Button>
        }
      />

      <ConfirmPhraseDialog
        open={stage === "phrase"}
        onOpenChange={(open) => {
          if (!open) stop();
        }}
        title={t("account:danger.confirmTitle")}
        description={match(hasPassword)
          .with(true, () => t("account:danger.confirmWithPassword"))
          .otherwise(() => t("account:danger.confirmWithoutPassword"))}
        phrase={phrase}
        phraseLabel={t("account:danger.phraseLabel")}
        confirmLabel={t("account:danger.continue")}
        canConfirm={!hasPassword || password.length > 0}
        onConfirm={() => setStage("final")}
      >
        {match(hasPassword)
          .with(true, () => (
            <div className="space-y-2">
              <Label htmlFor={passwordId}>{t("account:danger.password")}</Label>
              <Input
                id={passwordId}
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          ))
          .otherwise(() => (
            <p className="text-muted-foreground text-sm">{t("account:danger.codeOnlyHint")}</p>
          ))}
      </ConfirmPhraseDialog>

      <FinalWordDialog
        open={stage === "final"}
        onOpenChange={(open) => {
          if (!open) stop();
        }}
        title={t("account:danger.lastWord")}
        description={t("account:danger.lastWordDescription")}
        confirmLabel={t("account:danger.deleteForever")}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() =>
          remove.mutate({
            password: match(hasPassword)
              .with(true, () => password)
              .otherwise(() => undefined),
          })
        }
      >
        <p>{t("account:danger.losing")}</p>
        <p>{t("account:danger.keeping")}</p>
      </FinalWordDialog>
    </>
  );
}

/** The two ways out of absqir: leave the organization, or leave altogether. */
export function AccountDangerZone(props: AccountDangerZoneProps) {
  return (
    <DangerZone>
      {match({ role: props.role, organization: props.organization })
        .with({ role: P.nonNullable, organization: P.nonNullable }, ({ role, organization }) => (
          <LeaveOrganizationRow role={role} organization={organization} />
        ))
        .otherwise(() => null)}
      <DeleteAccountRow {...props} />
    </DangerZone>
  );
}
