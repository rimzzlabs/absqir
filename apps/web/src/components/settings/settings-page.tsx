import type { NotificationChannel } from "@absqir/core/notification-channel";
import { Reveal } from "@absqir/ui/reveal";
import {
  BellIcon,
  BuildingsIcon,
  EnvelopeSimpleIcon,
  GlobeHemisphereWestIcon,
  HandWavingIcon,
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
import { DomainsPanel } from "@/components/settings/domains-panel";
import { InvitationsPanel } from "@/components/settings/invitations-panel";
import { JoinRequestsPanel } from "@/components/settings/join-requests-panel";
import { MembersTable } from "@/components/settings/members-table";
import { OrganizationPanel } from "@/components/settings/organization-panel";
import { PreferencesPanel } from "@/components/settings/preferences-panel";
import { SettingsNav, type SettingsNavGroup } from "@/components/settings/settings-nav";
import { SettingsSection } from "@/components/settings/settings-section";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";

export interface SettingsPageProps {
  /** Null while the account belongs to no organization. */
  role: RoleName | null;
  /** The `tab` in the address, read on the server so the first paint is right. */
  requestedTab: string | null;
  /** Null alongside a null role. */
  organization: { id: string; name: string; slug: string } | null;
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

const ORGANIZATION_TABS = [
  "members",
  "invitations",
  "requests",
  "domains",
  "organization",
] as const;
const PERSONAL_TABS = ["profile", "preferences", "notifications", "security"] as const;
type SettingsTab = (typeof ORGANIZATION_TABS)[number] | (typeof PERSONAL_TABS)[number];

/** Old links say `account`. They land on the profile. */
const ALIASES: Record<string, SettingsTab> = { account: "profile" };

const ORGANIZATION_GROUP: SettingsNavGroup<SettingsTab> = {
  label: "Organization",
  items: [
    { value: "members", label: "Members", icon: UsersThreeIcon },
    { value: "invitations", label: "Invitations", icon: EnvelopeSimpleIcon },
    { value: "requests", label: "Requests", icon: HandWavingIcon },
    { value: "domains", label: "Domains", icon: GlobeHemisphereWestIcon },
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
  const runsOrganization =
    props.organization !== null && (props.role === "owner" || props.role === "admin");
  const groups = runsOrganization ? [ORGANIZATION_GROUP, PERSONAL_GROUP] : [PERSONAL_GROUP];
  const allowed: readonly SettingsTab[] = runsOrganization
    ? [...ORGANIZATION_TABS, ...PERSONAL_TABS]
    : PERSONAL_TABS;

  const [fromAddress, setTab] = useQueryState("tab", parseAsString);
  const requested = fromAddress ?? props.requestedTab;

  // A member who follows an admin's link lands on their own first section.
  const wanted = requested ? (ALIASES[requested] ?? requested) : null;
  const tab: SettingsTab = wanted && isTab(wanted, allowed) ? wanted : (allowed[0] ?? "profile");

  // Every organization tab is unreachable without a role, so each one folds
  // to nothing rather than carrying a null through the tree.
  const { role, organization } = props;

  const content = {
    members: role ? (
      <SettingsSection
        title="Members"
        description="Everyone with an account in the organization, and what each one can do."
      >
        <div className="pt-6">
          <MembersTable role={role} currentUserId={props.currentUserId} />
        </div>
      </SettingsSection>
    ) : null,
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
    requests: (
      <SettingsSection
        title="Requests"
        description="People at one of your domains who ask to come in."
      >
        <div className="pt-6">
          <JoinRequestsPanel />
        </div>
      </SettingsSection>
    ),
    domains: (
      <SettingsSection
        title="Domains"
        description="Claim the email domain your people share, so a new account finds this workspace on its own."
      >
        <div className="pt-6">
          <DomainsPanel />
        </div>
      </SettingsSection>
    ),
    organization:
      role && organization ? <OrganizationPanel role={role} organization={organization} /> : null,
    profile: (
      <ProfilePanel
        name={props.user.name}
        email={props.user.email}
        image={props.user.image}
        createdAt={props.user.createdAt}
        role={role}
        timezone={props.user.timezone}
        organization={organization}
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
