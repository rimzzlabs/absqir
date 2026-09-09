import { Separator } from "@absqir/ui/separator";
import { SidebarTrigger } from "@absqir/ui/sidebar";
import type { ShellUser } from "@/components/app-shell/app-shell";
import { NotificationBell } from "@/components/app-shell/notification-bell";
import { UserMenu } from "@/components/app-shell/user-menu";

export interface AppHeaderProps {
  title: string;
  user: ShellUser;
  /** The bell reads one organization, so it stays away until there is one. */
  hasOrganization: boolean;
}

/**
 * The app bar. On a desktop it sticks to the top of the page. On a phone it
 * sits at the bottom, where a thumb reaches, and pads itself past the home
 * indicator. The page column keeps room for it either way.
 */
export function AppHeader(props: AppHeaderProps) {
  return (
    <header
      data-slot="app-bar"
      className="border-border bg-background/90 supports-backdrop-filter:bg-background/75 fixed inset-x-0 bottom-0 z-30 flex h-[calc(var(--app-bar-height)+env(safe-area-inset-bottom))] shrink-0 items-center gap-2 border-t px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:inset-x-auto md:top-0 md:bottom-auto md:h-(--app-bar-height) md:border-t-0 md:border-b md:px-4 md:pb-0"
    >
      <SidebarTrigger className="max-md:size-10 md:-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4 self-center" />
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{props.title}</p>
      <div className="flex items-center gap-1">
        {props.hasOrganization ? <NotificationBell /> : null}
        <UserMenu user={props.user} />
      </div>
    </header>
  );
}
