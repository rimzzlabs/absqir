import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@absqir/ui/dropdown-menu";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@absqir/ui/responsive-dialog";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@absqir/ui/sidebar";
import { A } from "@mobily/ts-belt";
import { BuildingsIcon, CaretUpDownIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { ShellMembership } from "@/components/app-shell/app-shell";
import { FormError } from "@/components/shared/form-error";
import { OrganizationForm } from "@/components/shared/organization-form";
import { roleLabel } from "@/components/shared/role-badge";
import { initialsOf } from "@/lib/avatar";
import { useCreateOrganization } from "@/mutations/use-create-organization";
import { useSetActiveOrganization } from "@/mutations/use-set-active-organization";

export interface OrgSwitcherProps {
  memberships: readonly ShellMembership[];
  /** Null while the account belongs to no organization. */
  active: ShellMembership | null;
  canCreateOrganizations: boolean;
}

function OrgAvatar(props: { membership: ShellMembership; size?: "sm" | "default" }) {
  return (
    <Avatar size={props.size} className="rounded-md after:rounded-md">
      {props.membership.logo ? <AvatarImage src={props.membership.logo} alt="" /> : null}
      <AvatarFallback name={props.membership.name} className="rounded-md">
        {initialsOf(props.membership.name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function OrgSwitcher(props: OrgSwitcherProps) {
  const { isMobile } = useSidebar();
  const setActive = useSetActiveOrganization();
  const create = useCreateOrganization();
  const [creating, setCreating] = useState(false);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            {props.active ? (
              <OrgAvatar membership={props.active} />
            ) : (
              <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md">
                <BuildingsIcon />
              </div>
            )}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {props.active ? props.active.name : "No organization"}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {props.active ? roleLabel(props.active.role) : "Join one to get started"}
              </span>
            </div>
            <CaretUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {/* Base UI wants every label inside a group. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            </DropdownMenuGroup>
            {props.memberships.length === 0 ? (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground font-normal">
                  You are in none yet.
                </DropdownMenuLabel>
              </DropdownMenuGroup>
            ) : null}
            <DropdownMenuRadioGroup
              value={props.active?.organizationId ?? ""}
              onValueChange={(value) => {
                if (value && value !== props.active?.organizationId) setActive.mutate(value);
              }}
            >
              {A.map(props.memberships, (membership) => (
                <DropdownMenuRadioItem
                  key={membership.organizationId}
                  value={membership.organizationId}
                  disabled={setActive.isPending}
                >
                  <OrgAvatar membership={membership} size="sm" />
                  <span className="truncate">{membership.name}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {roleLabel(membership.role)}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            {props.canCreateOrganizations ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setCreating(true)}>
                    <PlusIcon />
                    New organization
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <ResponsiveDialog open={creating} onOpenChange={setCreating}>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>New organization</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                You become its owner. Invite people from the settings page.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>
              <OrganizationForm
                submitLabel="Create organization"
                pending={create.isPending}
                onSubmit={(values) => create.mutate(values)}
              />
              <FormError error={create.error ?? setActive.error} />
            </ResponsiveDialogBody>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
