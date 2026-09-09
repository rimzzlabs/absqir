import { SidebarInset, SidebarProvider } from "@absqir/ui/sidebar";
import { TooltipProvider } from "@absqir/ui/tooltip";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-shell/app-header";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import type { RoleName } from "@/components/app-shell/nav";
import { Providers } from "@/components/providers";

export interface ShellMembership {
  organizationId: string;
  name: string;
  slug: string;
  logo: string | null;
  role: RoleName;
}

export interface ShellUser {
  name: string;
  email: string;
  image: string | null;
  canCreateOrganizations: boolean;
}

export interface AppShellProps {
  user: ShellUser;
  memberships: ShellMembership[];
  /** Null while the account belongs to no organization. */
  active: ShellMembership | null;
  currentPath: string;
  title: string;
  /** The state the reader left the sidebar in, from the cookie. */
  sidebarOpen?: boolean;
  children: ReactNode;
}

/** On a phone the bar sits at the bottom, so the page keeps room under it. */
const PAGE =
  "flex min-w-0 flex-1 flex-col gap-6 p-4 pb-[calc(var(--app-bar-height)+env(safe-area-inset-bottom)+--spacing(4))] md:p-6";

/**
 * The dashboard frame: sidebar, header, page. Rendered on the server with
 * the active organization, so a switch reloads the page instead of juggling
 * every query's cache. An account that belongs to nowhere gets the same
 * frame with the navigation locked, so it can see what absqir is before it
 * has one.
 */
export function AppShell(props: AppShellProps) {
  return (
    <Providers>
      <TooltipProvider>
        <SidebarProvider defaultOpen={props.sidebarOpen ?? true}>
          <AppSidebar
            memberships={props.memberships}
            active={props.active}
            currentPath={props.currentPath}
            canCreateOrganizations={props.user.canCreateOrganizations}
          />
          <SidebarInset>
            <AppHeader
              title={props.title}
              user={props.user}
              hasOrganization={props.active !== null}
            />
            <div className={PAGE}>{props.children}</div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </Providers>
  );
}
