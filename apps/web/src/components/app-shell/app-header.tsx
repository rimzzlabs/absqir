import { Separator } from "@absqir/ui/separator";
import { SidebarTrigger } from "@absqir/ui/sidebar";
import type { ShellUser } from "@/components/app-shell/app-shell";
import { NotificationBell } from "@/components/app-shell/notification-bell";
import { UserMenu } from "@/components/app-shell/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export interface AppHeaderProps {
  title: string;
  user: ShellUser;
}

export function AppHeader(props: AppHeaderProps) {
  return (
    <header className="border-border flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <p className="text-sm font-medium">{props.title}</p>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />
        <UserMenu user={props.user} />
      </div>
    </header>
  );
}
