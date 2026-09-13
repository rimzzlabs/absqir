import { useTranslate } from "@absqir/i18n/react";
import { match } from "ts-pattern";
import { OrganizationCounts } from "@/components/settings/organization-counts";
import { OrganizationDangerZone } from "@/components/settings/organization-danger-zone";
import { OrganizationIdentifiers } from "@/components/settings/organization-identifiers";
import { OrganizationIdentity } from "@/components/settings/organization-identity";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { FormError } from "@/components/shared/form-error";
import { OrganizationForm } from "@/components/shared/organization-form";
import type { RoleName } from "@/components/shared/role-badge";
import { useUpdateOrganization } from "@/mutations/use-update-organization";

export interface OrganizationPanelProps {
  role: RoleName;
  organization: { id: string; name: string; slug: string };
}

function NameRow(props: OrganizationPanelProps) {
  const t = useTranslate();
  const update = useUpdateOrganization();
  const canEdit = props.role === "owner" || props.role === "admin";

  return (
    <SettingsRow
      label={t("settings:organization.nameRow")}
      hint={match(canEdit)
        .with(true, () => t("settings:organization.nameHintEditable"))
        .otherwise(() => t("settings:organization.nameHintReadOnly"))}
    >
      <fieldset disabled={!canEdit} className="max-w-md">
        <OrganizationForm
          submitLabel={t("common:actions.save")}
          pending={update.isPending}
          defaultValues={{ name: props.organization.name, slug: props.organization.slug }}
          onSubmit={(values) => update.mutate({ organizationId: props.organization.id, ...values })}
        />
      </fieldset>
      <FormError error={update.error} />
    </SettingsRow>
  );
}

/** Everything about the organization itself, from its logo down to its grave. */
export function OrganizationPanel(props: OrganizationPanelProps) {
  const t = useTranslate();
  const canEdit = props.role === "owner" || props.role === "admin";

  return (
    <div className="space-y-12">
      <SettingsSection
        title={t("settings:organization.title")}
        description={t("settings:organization.description")}
      >
        <OrganizationIdentity organization={props.organization} canEdit={canEdit} />
        <div className="border-border border-t">
          <NameRow {...props} />
          <OrganizationIdentifiers organization={props.organization} />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("settings:organization.glance")}
        description={t("settings:organization.glanceDescription")}
      >
        <OrganizationCounts />
      </SettingsSection>

      <OrganizationDangerZone role={props.role} organization={props.organization} />
    </div>
  );
}
