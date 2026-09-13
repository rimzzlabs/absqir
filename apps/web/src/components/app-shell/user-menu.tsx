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
import { SignOutIcon, SlidersHorizontalIcon, UserCircleIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
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
          {match(props.user.image)
            .with(P.string.minLength(1), (image) => <AvatarImage src={image} alt="" />)
            .otherwise(() => null)}
          <AvatarFallback name={props.user.name}>{initialsOf(props.user.name)}</AvatarFallback>
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
          <DropdownMenuItem render={<a href="/settings?tab=profile" />}>
            <UserCircleIcon />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<a href="/settings?tab=preferences" />}>
            <SlidersHorizontalIcon />
            Preferences
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
