import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@absqir/ui/dropdown-menu";
import { SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import type { ShellUser } from "@/components/app-shell/app-shell";
import { initialsOf } from "@/lib/avatar";
import { useSignOut } from "@/mutations/use-sign-out";

export interface UserMenuProps {
  user: ShellUser;
}

export function UserMenu(props: UserMenuProps) {
  const signOut = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Account menu" />}
      >
        <Avatar>
          {props.user.image ? <AvatarImage src={props.user.image} alt="" /> : null}
          <AvatarFallback>{initialsOf(props.user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        {/* Base UI wants every label inside a group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <p className="text-foreground text-sm font-medium">{props.user.name}</p>
            <p className="text-muted-foreground truncate text-xs">{props.user.email}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<a href="/account" />}>
            <UserCircleIcon />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={signOut.isPending} onClick={() => signOut.mutate()}>
            <SignOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
