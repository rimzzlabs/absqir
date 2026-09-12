import { Button } from "@absqir/ui/button";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { useId, useState } from "react";
import { ConfirmPhraseDialog } from "@/components/shared/confirm-phrase-dialog";
import { DangerZone, DangerZoneRow } from "@/components/shared/danger-zone";
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

function DeleteAccountRow(props: AccountDangerZoneProps) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const passwordId = useId();

  const remove = useDeleteAccount();
  const credentials = useCredentials();
  const owner = useSoleOwner(props.role);

  const hasPassword = credentials.data?.hasPassword ?? false;
  const blocked = owner.isSoleOwner && owner.othersPresent === true;

  const description = blocked
    ? `You hold the only owner seat in ${props.organization?.name ?? "your organization"}. Make somebody else an owner first.`
    : "Your profile, your devices, and your membership go. Attendance records stay, with nobody behind them.";

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
            onClick={() => setConfirming(true)}
          >
            Delete account
          </Button>
        }
      />

      <ConfirmPhraseDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open) setPassword("");
          setConfirming(open);
        }}
        title="Delete your account?"
        description={
          hasPassword
            ? "Give your password, then type the words below. You cannot sign in again."
            : "Type the words below. You cannot sign in again."
        }
        phrase={CONFIRM_PHRASE}
        phraseLabel="phrase"
        confirmLabel="Delete forever"
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(hasPassword ? { password } : {})}
      >
        {hasPassword ? (
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
        ) : (
          <p className="text-muted-foreground text-sm">
            This account signs in with a code, so the deletion needs a sign-in less than an hour
            old. If it is refused, sign out, sign in again, and come back.
          </p>
        )}
      </ConfirmPhraseDialog>
    </>
  );
}

/** The two ways out of absqir: leave the organization, or leave altogether. */
export function AccountDangerZone(props: AccountDangerZoneProps) {
  return (
    <DangerZone>
      {props.role && props.organization ? (
        <LeaveOrganizationRow role={props.role} organization={props.organization} />
      ) : null}
      <DeleteAccountRow {...props} />
    </DangerZone>
  );
}
