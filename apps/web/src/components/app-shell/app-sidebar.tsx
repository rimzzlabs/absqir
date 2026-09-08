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
import type { ShellMembership } from "@/components/app-shell/app-shell";
import { footerNavFor, isActivePath, type NavItem, navFor } from "@/components/app-shell/nav";
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
  const footer = footerNavFor(props.active.role);

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
          {footer.map((item) => (
            <NavEntry key={item.href} item={item} currentPath={props.currentPath} />
          ))}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
