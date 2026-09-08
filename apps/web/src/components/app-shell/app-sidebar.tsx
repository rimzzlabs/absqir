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
import { GITHUB_URL, isActivePath, type NavItem, navFor } from "@/components/app-shell/nav";
import { OrgSwitcher } from "@/components/app-shell/org-switcher";

export interface AppSidebarProps {
  memberships: ShellMembership[];
  active: ShellMembership;
  currentPath: string;
  canCreateOrganizations: boolean;
}

function NavEntry(props: { item: NavItem; currentPath: string }) {
  const { item } = props;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActivePath(item.href, props.currentPath)}
        tooltip={item.label}
        render={<a href={item.href} />}
      >
        <item.icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar(props: AppSidebarProps) {
  const groups = navFor(props.active.role);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrgSwitcher
          memberships={props.memberships}
          active={props.active}
          canCreateOrganizations={props.canCreateOrganizations}
        />
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
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
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
