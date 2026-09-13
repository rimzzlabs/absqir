import { useTranslate } from "@absqir/i18n/react";
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
  const t = useTranslate();
  const [confirming, setConfirming] = useState(false);
  const leave = useLeaveOrganization();
  const owner = useSoleOwner(props.role);

  const description = match(owner.isSoleOwner)
    .with(true, () => t("common:leaveOrganization.soleOwner"))
    .otherwise(() => t("common:leaveOrganization.description"));

  return (
    <>
      <DangerZoneRow
        title={t("common:leaveOrganization.rowTitle", { name: props.organization.name })}
        description={description}
        action={
          <Button
            type="button"
            variant="outline"
            disabled={owner.isSoleOwner || owner.checking}
            onClick={() => setConfirming(true)}
          >
            {t("common:actions.leave")}
          </Button>
        }
      />

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common:leaveOrganization.confirmTitle", { name: props.organization.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("common:leaveOrganization.confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormError error={leave.error} />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.stay")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={leave.isPending}
              onClick={() => leave.mutate(props.organization.id)}
            >
              {match(leave.isPending)
                .with(true, () => t("common:actions.leaving"))
                .otherwise(() => t("common:actions.leave"))}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
