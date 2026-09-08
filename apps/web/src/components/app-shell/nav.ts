import {
  CalendarBlankIcon,
  ChartBarIcon,
  ClockCounterClockwiseIcon,
  GearIcon,
  HouseIcon,
  type Icon,
  IdentificationCardIcon,
  NotePencilIcon,
  QrCodeIcon,
  RepeatIcon,
  ScanIcon,
  UsersIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";

export type RoleName = "owner" | "admin" | "organizer" | "member";

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  /** Lowest role that sees the entry. */
  minimum: RoleName;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const RANK: Record<RoleName, number> = { owner: 0, admin: 1, organizer: 2, member: 3 };

export function roleAtLeast(role: RoleName, minimum: RoleName): boolean {
  return RANK[role] <= RANK[minimum];
}

/** What owners, admins, and organizers see. */
export const MANAGER_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Home", icon: HouseIcon, minimum: "organizer" }],
  },
  {
    label: "Attendance",
    items: [
      { href: "/sessions", label: "Sessions", icon: QrCodeIcon, minimum: "organizer" },
      { href: "/calendar", label: "Calendar", icon: CalendarBlankIcon, minimum: "organizer" },
      { href: "/schedules", label: "Schedules", icon: RepeatIcon, minimum: "organizer" },
    ],
  },
  {
    label: "Directory",
    items: [
      { href: "/people", label: "People", icon: IdentificationCardIcon, minimum: "organizer" },
      { href: "/groups", label: "Groups", icon: UsersThreeIcon, minimum: "organizer" },
    ],
  },
  {
    label: "Requests and insight",
    items: [
      { href: "/leave", label: "Leave requests", icon: NotePencilIcon, minimum: "organizer" },
      { href: "/reports", label: "Reports", icon: ChartBarIcon, minimum: "organizer" },
    ],
  },
  {
    label: "Other",
    items: [{ href: "/settings", label: "Settings", icon: GearIcon, minimum: "organizer" }],
  },
];

/** What a member sees. */
export const MEMBER_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Home", icon: HouseIcon, minimum: "member" }],
  },
  {
    label: "Me",
    items: [
      { href: "/check-in", label: "Check in", icon: ScanIcon, minimum: "member" },
      { href: "/my/sessions", label: "My sessions", icon: QrCodeIcon, minimum: "member" },
      { href: "/my/history", label: "History", icon: ClockCounterClockwiseIcon, minimum: "member" },
      { href: "/my/leave", label: "My leave", icon: NotePencilIcon, minimum: "member" },
    ],
  },
  {
    label: "Other",
    items: [{ href: "/settings", label: "Settings", icon: GearIcon, minimum: "member" }],
  },
];

/** The public repository, linked from the sidebar footer. */
export const GITHUB_URL = "https://github.com/absqir/absqir";

export function navFor(role: RoleName): NavGroup[] {
  const groups = roleAtLeast(role, "organizer") ? MANAGER_NAV : MEMBER_NAV;

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => roleAtLeast(role, item.minimum)),
    }))
    .filter((group) => group.items.length > 0);
}

export function isActivePath(href: string, currentPath: string): boolean {
  if (href === "/") return currentPath === "/";

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export { UsersIcon };
