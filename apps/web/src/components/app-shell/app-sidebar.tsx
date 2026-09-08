import { cn } from "@absqir/ui/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@absqir/ui/sidebar";
import { ArrowSquareOutIcon, GithubLogoIcon } from "@phosphor-icons/react";
import type { ShellMembership } from "@/components/app-shell/app-shell";
import {
  CHECK_IN,
  GITHUB_URL,
  isActivePath,
  type NavItem,
  navFor,
  roleAtLeast,
} from "@/components/app-shell/nav";
import { OrgSwitcher } from "@/components/app-shell/org-switcher";
import { SidebarStatus } from "@/components/app-shell/sidebar-status";

export interface AppSidebarProps {
  memberships: ShellMembership[];
  active: ShellMembership;
  currentPath: string;
  canCreateOrganizations: boolean;
}

function NavEntry(props: { item: NavItem; currentPath: string }) {
  const { item } = props;
  const active = isActivePath(item.href, props.currentPath);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active} tooltip={item.label} render={<a href={item.href} />}>
        <item.icon
          weight={active ? "fill" : "regular"}
          className={cn("transition-colors", active ? "text-primary" : "")}
        />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * In the icon rail the solid block reads as a blob next to the ghost entries,
 * so the tile turns into a tinted cobalt square and only fills when active.
 */
const COLLAPSED_CHECK_IN =
  "group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:active:bg-primary/20 group-data-[collapsible=icon]:active:text-primary group-data-[collapsible=icon]:data-active:bg-primary group-data-[collapsible=icon]:data-active:text-primary-foreground group-data-[collapsible=icon]:data-active:hover:bg-primary/90 group-data-[collapsible=icon]:data-active:hover:text-primary-foreground";

/** A member's one action, filled in the brand color so it never hides in the list. */
function CheckInEntry(props: { currentPath: string }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActivePath(CHECK_IN.href, props.currentPath)}
          tooltip={CHECK_IN.label}
          render={<a href={CHECK_IN.href} />}
          className={cn(
            "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground data-active:bg-primary/90 data-active:text-primary-foreground justify-center font-medium shadow-sm [&_svg]:size-4",
            COLLAPSED_CHECK_IN,
          )}
        >
          <CHECK_IN.icon weight="bold" />
          <span className="group-data-[collapsible=icon]:sr-only">{CHECK_IN.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar(props: AppSidebarProps) {
  const groups = navFor(props.active.role);
  const member = !roleAtLeast(props.active.role, "organizer");

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-2">
        <OrgSwitcher
          memberships={props.memberships}
          active={props.active}
          canCreateOrganizations={props.canCreateOrganizations}
        />
        {member ? <CheckInEntry currentPath={props.currentPath} /> : null}
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[11px] tracking-wider uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavEntry key={item.href} item={item} currentPath={props.currentPath} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Star on GitHub"
              render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
            >
              <GithubLogoIcon weight="fill" />
              <span className="truncate">Star on GitHub</span>
              <ArrowSquareOutIcon aria-hidden className="text-muted-foreground ml-auto" />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarStatus />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
