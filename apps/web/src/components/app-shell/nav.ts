import { activeHref, isActivePath } from "@absqir/core/active-path";
import { orgPath } from "@absqir/core/org-path";
import { A } from "@mobily/ts-belt";
import {
  BuildingsIcon,
  CalendarBlankIcon,
  ChartBarIcon,
  ClockCounterClockwiseIcon,
  FlagIcon,
  GearIcon,
  HouseIcon,
  type Icon,
  NotePencilIcon,
  QrCodeIcon,
  RepeatIcon,
  ScanIcon,
  UsersIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { match } from "ts-pattern";

export type RoleName = "owner" | "admin" | "organizer" | "member";

/** The message key under `shell:nav` that names an entry. */
export type NavId =
  | "home"
  | "gettingStarted"
  | "events"
  | "calendar"
  | "schedules"
  | "organization"
  | "members"
  | "groups"
  | "leave"
  | "checkInProblems"
  | "reports"
  | "settings"
  | "checkIn"
  | "myEvents"
  | "history"
  | "myLeave";

/** The message key under `shell:groups` that names a group of entries. */
export type NavGroupId =
  | "overview"
  | "attendance"
  | "organization"
  | "requests"
  | "other"
  | "me"
  | "you";

export interface NavItem {
  /**
   * The address inside the organization, such as `/events`. `navFor` puts
   * the slug in front of it. An account entry carries its whole address
   * already, because no slug belongs there.
   */
  href: string;
  /** Named, not worded: the sidebar reads the name in the reader's language. */
  id: NavId;
  icon: Icon;
  /** Lowest role that sees the entry. */
  minimum: RoleName;
  /**
   * An account entry keeps its address at the root. One account holds one
   * profile across every organization, so the settings page has no slug.
   */
  scope?: "account";
}

export interface NavGroup {
  id: NavGroupId;
  items: readonly NavItem[];
}

const RANK: Record<RoleName, number> = { owner: 0, admin: 1, organizer: 2, member: 3 };

export function roleAtLeast(role: RoleName, minimum: RoleName): boolean {
  return RANK[role] <= RANK[minimum];
}

/** What owners, admins, and organizers see. */
export const MANAGER_NAV: NavGroup[] = [
  {
    id: "overview",
    items: [{ href: "/", id: "home", icon: HouseIcon, minimum: "organizer" }],
  },
  {
    id: "attendance",
    items: [
      { href: "/events", id: "events", icon: QrCodeIcon, minimum: "organizer" },
      { href: "/calendar", id: "calendar", icon: CalendarBlankIcon, minimum: "organizer" },
      { href: "/schedules", id: "schedules", icon: RepeatIcon, minimum: "organizer" },
    ],
  },
  {
    // The organization, the people in it, and the groups they sit in. One
    // context, so one menu: a reader never leaves it to rename either.
    id: "organization",
    items: [
      { href: "/organization", id: "organization", icon: BuildingsIcon, minimum: "admin" },
      { href: "/organization/members", id: "members", icon: UsersIcon, minimum: "admin" },
      { href: "/organization/groups", id: "groups", icon: UsersThreeIcon, minimum: "organizer" },
    ],
  },
  {
    id: "requests",
    items: [
      { href: "/leave", id: "leave", icon: NotePencilIcon, minimum: "organizer" },
      {
        href: "/check-in-problems",
        id: "checkInProblems",
        icon: FlagIcon,
        minimum: "organizer",
      },
      { href: "/reports", id: "reports", icon: ChartBarIcon, minimum: "organizer" },
    ],
  },
  {
    id: "other",
    items: [
      { href: "/settings", id: "settings", icon: GearIcon, minimum: "organizer", scope: "account" },
    ],
  },
];

/** A member's one action. It sits above the list, not in it. */
export const CHECK_IN: NavItem = {
  href: "/check-in",
  id: "checkIn",
  icon: ScanIcon,
  minimum: "member",
};

/** What a member sees. */
export const MEMBER_NAV: NavGroup[] = [
  {
    id: "overview",
    items: [{ href: "/", id: "home", icon: HouseIcon, minimum: "member" }],
  },
  {
    id: "me",
    items: [
      { href: "/my/events", id: "myEvents", icon: QrCodeIcon, minimum: "member" },
      { href: "/my/history", id: "history", icon: ClockCounterClockwiseIcon, minimum: "member" },
      { href: "/my/leave", id: "myLeave", icon: NotePencilIcon, minimum: "member" },
    ],
  },
  {
    id: "other",
    items: [
      { href: "/settings", id: "settings", icon: GearIcon, minimum: "member", scope: "account" },
    ],
  },
];

/**
 * What an account with no organization sees. Everything on this list works
 * without one, so nothing here is a dead entry.
 */
export const SOLO_NAV: NavGroup[] = [
  {
    id: "overview",
    items: [{ href: "/", id: "gettingStarted", icon: HouseIcon, minimum: "member" }],
  },
  {
    id: "you",
    items: [
      { href: "/settings", id: "settings", icon: GearIcon, minimum: "member", scope: "account" },
    ],
  },
];

/** The public repository, linked from the sidebar footer. */
export const GITHUB_URL = "https://github.com/rimzzlabs/absqir";

export interface NavForParams {
  role: RoleName;
  /** The organization the address names. Every entry hangs under it. */
  slug: string;
}

/** The address an entry points at, with the slug in front where it belongs. */
function hrefOf(item: NavItem, slug: string): string {
  return match(item.scope)
    .with("account", () => item.href)
    .otherwise(() => orgPath(slug, item.href));
}

export function navFor(params: NavForParams): NavGroup[] {
  const { role, slug } = params;
  const groups = match(roleAtLeast(role, "organizer"))
    .with(true, () => MANAGER_NAV)
    .otherwise(() => MEMBER_NAV);

  return groups
    .map((group) => ({
      ...group,
      items: A.map(
        A.filter(group.items, (item) => roleAtLeast(role, item.minimum)),
        (item) => ({ ...item, href: hrefOf(item, slug) }),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** A member's one action, pointed at the organization in the address. */
export function checkInEntry(slug: string): NavItem {
  return { ...CHECK_IN, href: orgPath(slug, CHECK_IN.href) };
}

export interface ActiveHrefParams {
  groups: readonly NavGroup[];
  currentPath: string;
  /** The dashboard of the organization, such as `/acme`. */
  home: string;
}

/** The entry the reader is standing on, across every group in the sidebar. */
export function activeHrefFor(params: ActiveHrefParams): string | null {
  const found = activeHref(
    A.flatMap(params.groups, (group) => A.map(group.items, (item) => item.href)),
    params.currentPath,
  );

  // The dashboard is an ancestor of every page in the organization, so on a
  // page with no entry of its own it would be the last one lit. It lights on
  // itself instead.
  return match(found === params.home && params.currentPath !== params.home)
    .with(true, () => null)
    .otherwise(() => found);
}

export { isActivePath };
