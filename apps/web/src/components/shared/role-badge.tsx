import { Badge } from "@absqir/ui/badge";
import { match } from "ts-pattern";

export type RoleName = "owner" | "admin" | "organizer" | "member";

const LABELS: Record<RoleName, string> = {
  owner: "Owner",
  admin: "Admin",
  organizer: "Organizer",
  member: "Member",
};

export interface RoleBadgeProps {
  role: RoleName;
}

export function RoleBadge(props: RoleBadgeProps) {
  const variant = match(props.role)
    .with("member", () => "outline" as const)
    .otherwise(() => "secondary" as const);

  return <Badge variant={variant}>{LABELS[props.role]}</Badge>;
}

export function roleLabel(role: RoleName): string {
  return LABELS[role];
}
