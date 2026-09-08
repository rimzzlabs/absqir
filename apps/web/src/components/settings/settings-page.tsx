import { Tabs, TabsContent, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { AccountPanel } from "@/components/account/account-panel";
import { Providers } from "@/components/providers";
import { InvitationsPanel } from "@/components/settings/invitations-panel";
import { MembersTable } from "@/components/settings/members-table";
import { OrganizationSettings } from "@/components/settings/organization-settings";
import { PreferencesPanel } from "@/components/settings/preferences-panel";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";

export interface SettingsPageProps {
  role: RoleName;
  organization: { id: string; name: string; slug: string };
  currentUserId: string;
  user: { name: string; email: string; image: string | null };
}

const ORGANIZATION_TABS = ["members", "invitations", "organization"] as const;
const PERSONAL_TABS = ["account", "preferences"] as const;
type SettingsTab = (typeof ORGANIZATION_TABS)[number] | (typeof PERSONAL_TABS)[number];

const TAB = parseAsStringLiteral<SettingsTab>([...ORGANIZATION_TABS, ...PERSONAL_TABS]);

const LABELS: Record<SettingsTab, string> = {
  members: "Members",
  invitations: "Invitations",
  organization: "Organization",
  account: "Account",
  preferences: "Preferences",
};

function SettingsBody(props: SettingsPageProps) {
  const runsOrganization = props.role === "owner" || props.role === "admin";
  const tabs: SettingsTab[] = runsOrganization
    ? [...ORGANIZATION_TABS, ...PERSONAL_TABS]
    : [...PERSONAL_TABS];
  const [requested, setTab] = useQueryState("tab", TAB);

  // A member who follows an admin's link lands on their own first tab.
  const tab: SettingsTab =
    requested && tabs.includes(requested) ? requested : (tabs[0] ?? "account");

  return (
    <>
      <PageHeader
        title="Settings"
        description={
          runsOrganization
            ? "The organization, the accounts in it, and your own."
            : "Your account and how the app behaves for you."
        }
      />

      <Tabs value={tab} onValueChange={(value) => void setTab(value as SettingsTab)}>
        <TabsList>
          {tabs.map((value) => (
            <TabsTrigger key={value} value={value}>
              {LABELS[value]}
            </TabsTrigger>
          ))}
        </TabsList>

        {runsOrganization ? (
          <>
            <TabsContent value="members" className="pt-4">
              <MembersTable role={props.role} currentUserId={props.currentUserId} />
            </TabsContent>
            <TabsContent value="invitations" className="pt-4">
              <InvitationsPanel />
            </TabsContent>
            <TabsContent value="organization" className="pt-4">
              <OrganizationSettings role={props.role} organization={props.organization} />
            </TabsContent>
          </>
        ) : null}
        <TabsContent value="account" className="pt-4">
          <AccountPanel name={props.user.name} email={props.user.email} image={props.user.image} />
        </TabsContent>
        <TabsContent value="preferences" className="pt-4">
          <PreferencesPanel />
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
