import { Badge } from "@absqir/ui/badge";

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
  const variant = props.role === "member" ? "outline" : "secondary";

  return <Badge variant={variant}>{LABELS[props.role]}</Badge>;
}

export function roleLabel(role: RoleName): string {
  return LABELS[role];
}
