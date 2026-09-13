import type { RoleName } from "@absqir/core/member-access";
import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Badge } from "@absqir/ui/badge";
import { match } from "ts-pattern";

export type { RoleName };

export interface RoleBadgeProps {
  role: RoleName;
}

export function RoleBadge(props: RoleBadgeProps) {
  const t = useTranslate();
  const variant = match(props.role)
    .with("member", () => "outline" as const)
    .otherwise(() => "secondary" as const);

  return <Badge variant={variant}>{roleLabel(t, props.role)}</Badge>;
}

/** The name of a role, for a line that is not a badge. */
export function roleLabel(t: Translate, role: RoleName): string {
  return t(`common:roles.${role}`);
}
