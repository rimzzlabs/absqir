import { ROLE_LABELS, type RoleName } from "@absqir/core/member-access";
import { Badge } from "@absqir/ui/badge";
import { match } from "ts-pattern";

export type { RoleName };

export interface RoleBadgeProps {
  role: RoleName;
}

export function RoleBadge(props: RoleBadgeProps) {
  const variant = match(props.role)
    .with("member", () => "outline" as const)
    .otherwise(() => "secondary" as const);

  return <Badge variant={variant}>{ROLE_LABELS[props.role]}</Badge>;
}

export function roleLabel(role: RoleName): string {
  return ROLE_LABELS[role];
}
