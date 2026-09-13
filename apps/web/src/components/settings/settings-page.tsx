import type { NotificationChannel } from "@absqir/core/notification-channel";
import type { Locale, Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Reveal } from "@absqir/ui/reveal";
import {
  BellIcon,
  BuildingsIcon,
  EnvelopeSimpleIcon,
  GlobeHemisphereWestIcon,
  HandWavingIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { parseAsString, useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { match, P } from "ts-pattern";
import { NotificationsPanel } from "@/components/account/notifications-panel";
import { ProfilePanel } from "@/components/account/profile-panel";
import { SecurityPanel } from "@/components/account/security-panel";
import { Providers } from "@/components/providers";
import { DomainsPanel } from "@/components/settings/domains-panel";
import { InvitationsPanel } from "@/components/settings/invitations-panel";
import { JoinRequestsPanel } from "@/components/settings/join-requests-panel";
import { MembersTable } from "@/components/settings/members-table";
import { OrganizationPanel } from "@/components/settings/organization-panel";
import { PlacesPanel } from "@/components/settings/places-panel";
import { PreferencesPanel } from "@/components/settings/preferences-panel";
import { SettingsNav, type SettingsNavGroup } from "@/components/settings/settings-nav";
import { SettingsSection } from "@/components/settings/settings-section";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";

export interface SettingsPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** Null while the account belongs to no organization. */
  role: RoleName | null;
  currentUserId: string;
  /** The `tab` in the address, read on the server so the first paint is right. */
  requestedTab: string | null;
  /** Null alongside a null role. */
  organization: { id: string; name: string; slug: string } | null;
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
  "places",
  "domains",
  "organization",
] as const;
const PERSONAL_TABS = ["profile", "preferences", "notifications", "security"] as const;
type SettingsTab = (typeof ORGANIZATION_TABS)[number] | (typeof PERSONAL_TABS)[number];

/** Old links say `account`. They land on the profile. */
const ALIASES: Record<string, SettingsTab> = { account: "profile" };

function organizationGroup(t: Translate): SettingsNavGroup<SettingsTab> {
  return {
    label: t("settings:nav.organization"),
    items: [
      { value: "members", label: t("settings:nav.members"), icon: UsersThreeIcon },
      { value: "invitations", label: t("settings:nav.invitations"), icon: EnvelopeSimpleIcon },
      { value: "requests", label: t("settings:nav.requests"), icon: HandWavingIcon },
      { value: "places", label: t("settings:nav.places"), icon: MapPinIcon },
      { value: "domains", label: t("settings:nav.domains"), icon: GlobeHemisphereWestIcon },
      { value: "organization", label: t("settings:nav.organizationTab"), icon: BuildingsIcon },
    ],
  };
}

function personalGroup(t: Translate): SettingsNavGroup<SettingsTab> {
  return {
    label: t("settings:nav.you"),
    items: [
      { value: "profile", label: t("settings:nav.profile"), icon: UserCircleIcon },
      { value: "preferences", label: t("settings:nav.preferences"), icon: SlidersHorizontalIcon },
      { value: "notifications", label: t("settings:nav.notifications"), icon: BellIcon },
      { value: "security", label: t("settings:nav.security"), icon: ShieldCheckIcon },
    ],
  };
}

function isTab(value: string, allowed: readonly SettingsTab[]): value is SettingsTab {
  return (allowed as readonly string[]).includes(value);
}

function SettingsBody(props: SettingsPageProps) {
  const t = useTranslate();
  const runsOrganization =
    props.organization !== null && (props.role === "owner" || props.role === "admin");
  const groups = match(runsOrganization)
    .with(true, () => [organizationGroup(t), personalGroup(t)])
    .otherwise(() => [personalGroup(t)]);
  const allowed: readonly SettingsTab[] = match(runsOrganization)
    .with(true, () => [...ORGANIZATION_TABS, ...PERSONAL_TABS])
    .otherwise(() => PERSONAL_TABS);

  const [fromAddress, setTab] = useQueryState("tab", parseAsString);
  const requested = fromAddress ?? props.requestedTab;

  // A member who follows an admin's link lands on their own first section.
  const wanted = match(requested)
    .with(P.string.minLength(1), (requested) => ALIASES[requested] ?? requested)
    .otherwise(() => null);
  const tab: SettingsTab = match(wanted)
    .when(
      (name): name is SettingsTab => name !== null && isTab(name, allowed),
      (name) => name,
    )
    .otherwise(() => allowed[0] ?? "profile");

  // Every organization tab is unreachable without a role, so each one folds
  // to nothing rather than carrying a null through the tree.
  const { role, organization } = props;

  const content = {
    members: match(role)
      .with(P.string.minLength(1), (role) => (
        <SettingsSection
          title={t("settings:sections.members")}
          description={t("settings:sections.membersDescription")}
        >
          <div className="pt-6">
            <MembersTable role={role} currentUserId={props.currentUserId} />
          </div>
        </SettingsSection>
      ))
      .otherwise(() => null),
    invitations: (
      <SettingsSection
        title={t("settings:sections.invitations")}
        description={t("settings:sections.invitationsDescription")}
      >
        <div className="pt-6">
          <InvitationsPanel />
        </div>
      </SettingsSection>
    ),
    requests: (
      <SettingsSection
        title={t("settings:sections.requests")}
        description={t("settings:sections.requestsDescription")}
      >
        <div className="pt-6">
          <JoinRequestsPanel />
        </div>
      </SettingsSection>
    ),
    places: (
      <SettingsSection
        title={t("settings:sections.places")}
        description={t("settings:sections.placesDescription")}
      >
        <div className="pt-6">
          <PlacesPanel />
        </div>
      </SettingsSection>
    ),
    domains: (
      <SettingsSection
        title={t("settings:sections.domains")}
        description={t("settings:sections.domainsDescription")}
      >
        <div className="pt-6">
          <DomainsPanel />
        </div>
      </SettingsSection>
    ),
    organization: match({ role, organization })
      .with({ role: P.nonNullable, organization: P.nonNullable }, ({ role, organization }) => (
        <OrganizationPanel role={role} organization={organization} />
      ))
      .otherwise(() => null),
    profile: (
      <ProfilePanel
        name={props.user.name}
        email={props.user.email}
        image={props.user.image}
        createdAt={props.user.createdAt}
        role={role}
        locale={props.locale}
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
        title={t("settings:title")}
        description={match(runsOrganization)
          .with(true, () => t("settings:descriptionOrganization"))
          .otherwise(() => t("settings:descriptionPersonal"))}
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
    <Providers locale={props.locale}>
      <SettingsBody {...props} />
    </Providers>
  );
}
