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

/** Short enough to type once, and impossible to press by accident. */
const CONFIRM_PHRASE = "Delete my account";

export interface AccountDangerZoneProps {
  /** Null while the account belongs to no organization. */
  role: RoleName | null;
  organization: { id: string; name: string; slug: string } | null;
}

type Stage = "idle" | "phrase" | "final";

function DeleteAccountRow(props: AccountDangerZoneProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [password, setPassword] = useState("");
  const passwordId = useId();

  const remove = useDeleteAccount();
  const credentials = useCredentials();
  const owner = useSoleOwner(props.role);

  const hasPassword = credentials.data?.hasPassword ?? false;
  const blocked = owner.isSoleOwner && owner.othersPresent === true;

  const description = match(blocked)
    .with(
      true,
      () =>
        `You hold the only owner seat in ${props.organization?.name ?? "your organization"}. Make somebody else an owner first.`,
    )
    .otherwise(
      () =>
        "Your profile, your devices, and your membership go. Attendance records stay, with nobody behind them." as const,
    );

  const stop = () => {
    setStage("idle");
    setPassword("");
    remove.reset();
  };

  return (
    <>
      <DangerZoneRow
        title="Delete your account"
        description={description}
        action={
          <Button
            type="button"
            variant="destructive"
            disabled={blocked || owner.checking}
            onClick={() => setStage("phrase")}
          >
            Delete account
          </Button>
        }
      />

      <ConfirmPhraseDialog
        open={stage === "phrase"}
        onOpenChange={(open) => {
          if (!open) stop();
        }}
        title="Delete your account?"
        description={match(hasPassword)
          .with(true, () => "Give your password, then type the words below." as const)
          .otherwise(() => "Type the words below to go on." as const)}
        phrase={CONFIRM_PHRASE}
        phraseLabel="phrase"
        confirmLabel="Continue"
        canConfirm={!hasPassword || password.length > 0}
        onConfirm={() => setStage("final")}
      >
        {match(hasPassword)
          .with(true, () => (
            <div className="space-y-2">
              <Label htmlFor={passwordId}>Password</Label>
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
            <p className="text-muted-foreground text-sm">
              This account signs in with a code, so the deletion needs a sign-in less than an hour
              old. If it is refused, sign out, sign in again, and come back.
            </p>
          ))}
      </ConfirmPhraseDialog>

      <FinalWordDialog
        open={stage === "final"}
        onOpenChange={(open) => {
          if (!open) stop();
        }}
        title="Last word"
        description="Press the button and your account is gone. Nobody can bring it back."
        confirmLabel="Delete forever"
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
        <p>
          Your name, your picture, your signed-in devices, and every organization you belong to go
          with it.
        </p>
        <p>
          Attendance records stay, with nobody behind them, so the reports of past events still add
          up.
        </p>
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
