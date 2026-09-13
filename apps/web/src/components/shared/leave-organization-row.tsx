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
import { Button } from "@absqir/ui/button";
import { useState } from "react";
import { match } from "ts-pattern";
import { DangerZoneRow } from "@/components/shared/danger-zone";
import { FormError } from "@/components/shared/form-error";
import type { RoleName } from "@/components/shared/role-badge";
import { useSoleOwner } from "@/lib/use-sole-owner";
import { useLeaveOrganization } from "@/mutations/use-leave-organization";

export interface LeaveOrganizationRowProps {
  role: RoleName;
  organization: { id: string; name: string };
}

/**
 * The same row on the organization tab and on the profile tab, because
 * leaving is both an organization act and an account act.
 */
export function LeaveOrganizationRow(props: LeaveOrganizationRowProps) {
  const [confirming, setConfirming] = useState(false);
  const leave = useLeaveOrganization();
  const owner = useSoleOwner(props.role);

  const description = match(owner.isSoleOwner)
    .with(
      true,
      () =>
        "You hold the only owner seat. Make somebody else an owner first, or delete the organization." as const,
    )
    .otherwise(
      () =>
        "You lose every screen behind this organization. Your directory entry stays, without an account behind it." as const,
    );

  return (
    <>
      <DangerZoneRow
        title={`Leave ${props.organization.name}`}
        description={description}
        action={
          <Button
            type="button"
            variant="outline"
            disabled={owner.isSoleOwner || owner.checking}
            onClick={() => setConfirming(true)}
          >
            Leave
          </Button>
        }
      />

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {props.organization.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You need a new invitation to come back. Your account and your history stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormError error={leave.error} />
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={leave.isPending}
              onClick={() => leave.mutate(props.organization.id)}
            >
              {match(leave.isPending)
                .with(true, () => "Leaving…" as const)
                .otherwise(() => "Leave" as const)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
