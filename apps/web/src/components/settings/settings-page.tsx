import type { NotificationChannel } from "@absqir/core/notification-channel";
import { Reveal } from "@absqir/ui/reveal";
import {
  BellIcon,
  BuildingsIcon,
  EnvelopeSimpleIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { parseAsString, useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { NotificationsPanel } from "@/components/account/notifications-panel";
import { ProfilePanel } from "@/components/account/profile-panel";
import { SecurityPanel } from "@/components/account/security-panel";
import { Providers } from "@/components/providers";
import { InvitationsPanel } from "@/components/settings/invitations-panel";
import { MembersTable } from "@/components/settings/members-table";
import { OrganizationSettings } from "@/components/settings/organization-settings";
import { PreferencesPanel } from "@/components/settings/preferences-panel";
import { SettingsNav, type SettingsNavGroup } from "@/components/settings/settings-nav";
import { SettingsSection } from "@/components/settings/settings-section";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";

export interface SettingsPageProps {
  role: RoleName;
  /** The `tab` in the address, read on the server so the first paint is right. */
  requestedTab: string | null;
  organization: { id: string; name: string; slug: string };
  currentUserId: string;
  user: {
    name: string;
    email: string;
    image: string | null;
    /** When the account was made, as an ISO instant. */
    createdAt: string;
    notificationChannel: NotificationChannel;
    /** The stored zone. Null follows the device. */
    timezone: string | null;
  };
}

const ORGANIZATION_TABS = ["members", "invitations", "organization"] as const;
const PERSONAL_TABS = ["profile", "preferences", "notifications", "security"] as const;
type SettingsTab = (typeof ORGANIZATION_TABS)[number] | (typeof PERSONAL_TABS)[number];

/** Old links say `account`. They land on the profile. */
const ALIASES: Record<string, SettingsTab> = { account: "profile" };

const ORGANIZATION_GROUP: SettingsNavGroup<SettingsTab> = {
  label: "Organization",
  items: [
    { value: "members", label: "Members", icon: UsersThreeIcon },
    { value: "invitations", label: "Invitations", icon: EnvelopeSimpleIcon },
    { value: "organization", label: "Organization", icon: BuildingsIcon },
  ],
};

const PERSONAL_GROUP: SettingsNavGroup<SettingsTab> = {
  label: "You",
  items: [
    { value: "profile", label: "Profile", icon: UserCircleIcon },
    { value: "preferences", label: "Preferences", icon: SlidersHorizontalIcon },
    { value: "notifications", label: "Notifications", icon: BellIcon },
    { value: "security", label: "Security", icon: ShieldCheckIcon },
  ],
};

function isTab(value: string, allowed: readonly SettingsTab[]): value is SettingsTab {
  return (allowed as readonly string[]).includes(value);
}

function SettingsBody(props: SettingsPageProps) {
  const runsOrganization = props.role === "owner" || props.role === "admin";
  const groups = runsOrganization ? [ORGANIZATION_GROUP, PERSONAL_GROUP] : [PERSONAL_GROUP];
  const allowed: readonly SettingsTab[] = runsOrganization
    ? [...ORGANIZATION_TABS, ...PERSONAL_TABS]
    : PERSONAL_TABS;

  const [fromAddress, setTab] = useQueryState("tab", parseAsString);
  const requested = fromAddress ?? props.requestedTab;

  // A member who follows an admin's link lands on their own first section.
  const wanted = requested ? (ALIASES[requested] ?? requested) : null;
  const tab: SettingsTab = wanted && isTab(wanted, allowed) ? wanted : (allowed[0] ?? "profile");

  const content = {
    members: (
      <SettingsSection
        title="Members"
        description="Everyone with an account in the organization, and what each one can do."
      >
        <div className="pt-6">
          <MembersTable role={props.role} currentUserId={props.currentUserId} />
        </div>
      </SettingsSection>
    ),
    invitations: (
      <SettingsSection
        title="Invitations"
        description="Bring someone in by email. The link works for seven days."
      >
        <div className="pt-6">
          <InvitationsPanel />
        </div>
      </SettingsSection>
    ),
    organization: (
      <SettingsSection
        title="Organization"
        description="The name people see, and the slug that appears in links."
      >
        <div className="pt-6">
          <OrganizationSettings role={props.role} organization={props.organization} />
        </div>
      </SettingsSection>
    ),
    profile: (
      <ProfilePanel
        name={props.user.name}
        email={props.user.email}
        image={props.user.image}
        createdAt={props.user.createdAt}
        role={props.role}
        timezone={props.user.timezone}
      />
    ),
    preferences: <PreferencesPanel />,
    notifications: <NotificationsPanel channel={props.user.notificationChannel} />,
    security: <SecurityPanel />,
  } satisfies Record<SettingsTab, ReactNode>;

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

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <SettingsNav groups={groups} value={tab} onChange={(value) => void setTab(value)} />

        <div className="min-w-0">
          <Reveal key={tab}>{content[tab]}</Reveal>
        </div>
      </div>
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
