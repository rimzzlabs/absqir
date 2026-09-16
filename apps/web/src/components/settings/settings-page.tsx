import type { NotificationChannel } from "@absqir/core/notification-channel";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Reveal } from "@absqir/ui/reveal";
import {
  BellIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { parseAsString, useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { match, P } from "ts-pattern";
import { NotificationsPanel } from "@/components/account/notifications-panel";
import { ProfilePanel } from "@/components/account/profile-panel";
import { SecurityPanel } from "@/components/account/security-panel";
import { Providers } from "@/components/providers";
import { PreferencesPanel } from "@/components/settings/preferences-panel";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";
import { SectionNav } from "@/components/shared/section-nav";

export interface SettingsPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** Null while the account belongs to no organization. */
  role: RoleName | null;
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

/**
 * Settings holds the account only. Everything the organization owns lives
 * under /organization, where the reader manages the organization itself.
 */
const TABS = ["profile", "preferences", "notifications", "security"] as const;
type SettingsTab = (typeof TABS)[number];

/** Old links say `account`. They land on the profile. */
const ALIASES: Record<string, SettingsTab> = { account: "profile" };

function isTab(value: string): value is SettingsTab {
  return (TABS as readonly string[]).includes(value);
}

function SettingsBody(props: SettingsPageProps) {
  const t = useTranslate();
  const [fromAddress, setTab] = useQueryState("tab", parseAsString);
  const requested = fromAddress ?? props.requestedTab;

  const wanted = match(requested)
    .with(P.string.minLength(1), (requested) => ALIASES[requested] ?? requested)
    .otherwise(() => null);
  const tab: SettingsTab = match(wanted)
    .when(
      (name): name is SettingsTab => name !== null && isTab(name),
      (name) => name,
    )
    .otherwise(() => "profile" as const);

  const content = {
    profile: (
      <ProfilePanel
        name={props.user.name}
        email={props.user.email}
        image={props.user.image}
        createdAt={props.user.createdAt}
        role={props.role}
        timezone={props.user.timezone}
        organization={props.organization}
      />
    ),
    preferences: <PreferencesPanel locale={props.locale} />,
    notifications: <NotificationsPanel channel={props.user.notificationChannel} />,
    security: <SecurityPanel />,
  } satisfies Record<SettingsTab, ReactNode>;

  return (
    <>
      <PageHeader title={t("settings:title")} description={t("settings:description")} />

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <SectionNav
          label={t("settings:nav.label")}
          groups={[
            {
              label: null,
              items: [
                { value: "profile", label: t("settings:nav.profile"), icon: UserCircleIcon },
                {
                  value: "preferences",
                  label: t("settings:nav.preferences"),
                  icon: SlidersHorizontalIcon,
                },
                {
                  value: "notifications",
                  label: t("settings:nav.notifications"),
                  icon: BellIcon,
                },
                { value: "security", label: t("settings:nav.security"), icon: ShieldCheckIcon },
              ],
            },
          ]}
          value={tab}
          onChange={(value) => void setTab(value)}
        />

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
