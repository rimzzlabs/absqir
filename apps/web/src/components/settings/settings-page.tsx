import { Tabs, TabsContent, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { Providers } from "@/components/providers";
import { InvitationsPanel } from "@/components/settings/invitations-panel";
import { MembersTable } from "@/components/settings/members-table";
import { OrganizationSettings } from "@/components/settings/organization-settings";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";

export interface SettingsPageProps {
  role: RoleName;
  organization: { id: string; name: string; slug: string };
  currentUserId: string;
}

function SettingsBody(props: SettingsPageProps) {
  return (
    <>
      <PageHeader
        title="Settings"
        description="The organization, the accounts in it, and who is still to arrive."
      />

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="pt-4">
          <MembersTable role={props.role} currentUserId={props.currentUserId} />
        </TabsContent>
        <TabsContent value="invitations" className="pt-4">
          <InvitationsPanel />
        </TabsContent>
        <TabsContent value="organization" className="pt-4">
          <OrganizationSettings role={props.role} organization={props.organization} />
        </TabsContent>
      </Tabs>
    </>
  );
}

export function SettingsPage(props: SettingsPageProps) {
  return (
    <Providers>
      <SettingsBody {...props} />
    </Providers>
  );
}
