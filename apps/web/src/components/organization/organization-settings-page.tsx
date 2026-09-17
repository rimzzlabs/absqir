import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Reveal } from "@absqir/ui/reveal";
import { BuildingsIcon, GlobeHemisphereWestIcon, MapPinIcon } from "@phosphor-icons/react";
import { parseAsString, useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { match, P } from "ts-pattern";
import { DomainsPanel } from "@/components/organization/domains-panel";
import { OrganizationPanel } from "@/components/organization/organization-panel";
import { PlacesPanel } from "@/components/organization/places-panel";
import { Providers } from "@/components/providers";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";
import { SectionNav } from "@/components/shared/section-nav";
import { SettingsSection } from "@/components/shared/settings-section";

export interface OrganizationSettingsPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
  role: RoleName;
  organization: { id: string; name: string; slug: string };
  /** The `tab` in the address, read on the server so the first paint is right. */
  requestedTab: string | null;
}

const TABS = ["general", "places", "domains"] as const;
type OrganizationTab = (typeof TABS)[number];

/** Old settings links name the tab the way the settings page did. */
const ALIASES: Record<string, OrganizationTab> = { organization: "general" };

function isTab(value: string): value is OrganizationTab {
  return (TABS as readonly string[]).includes(value);
}

function OrganizationSettingsBody(props: OrganizationSettingsPageProps) {
  const t = useTranslate();
  const [fromAddress, setTab] = useQueryState("tab", parseAsString);
  const requested = fromAddress ?? props.requestedTab;

  const wanted = match(requested)
    .with(P.string.minLength(1), (requested) => ALIASES[requested] ?? requested)
    .otherwise(() => null);
  const tab: OrganizationTab = match(wanted)
    .when(
      (name): name is OrganizationTab => name !== null && isTab(name),
      (name) => name,
    )
    .otherwise(() => "general" as const);

  const content = {
    general: <OrganizationPanel role={props.role} organization={props.organization} />,
    places: (
      <SettingsSection
        title={t("organization:sections.places")}
        description={t("organization:sections.placesDescription")}
      >
        <div className="pt-6">
          <PlacesPanel />
        </div>
      </SettingsSection>
    ),
    domains: (
      <SettingsSection
        title={t("organization:sections.domains")}
        description={t("organization:sections.domainsDescription")}
      >
        <div className="pt-6">
          <DomainsPanel />
        </div>
      </SettingsSection>
    ),
  } satisfies Record<OrganizationTab, ReactNode>;

  return (
    <>
      <PageHeader title={t("organization:title")} description={t("organization:description")} />

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <SectionNav
          label={t("organization:nav.label")}
          groups={[
            {
              label: null,
              items: [
                { value: "general", label: t("organization:nav.general"), icon: BuildingsIcon },
                { value: "places", label: t("organization:nav.places"), icon: MapPinIcon },
                {
                  value: "domains",
                  label: t("organization:nav.domains"),
                  icon: GlobeHemisphereWestIcon,
                },
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

export function OrganizationSettingsPage(props: OrganizationSettingsPageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <OrganizationSettingsBody {...props} />
    </Providers>
  );
}
