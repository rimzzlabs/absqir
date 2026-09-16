import { useTranslate } from "@absqir/i18n/react";
import { match } from "ts-pattern";
import { OrganizationCounts } from "@/components/organization/organization-counts";
import { OrganizationDangerZone } from "@/components/organization/organization-danger-zone";
import { OrganizationIdentifiers } from "@/components/organization/organization-identifiers";
import { OrganizationIdentity } from "@/components/organization/organization-identity";
import { FormError } from "@/components/shared/form-error";
import { OrganizationForm } from "@/components/shared/organization-form";
import type { RoleName } from "@/components/shared/role-badge";
import { SettingsRow, SettingsSection } from "@/components/shared/settings-section";
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
      label={t("organization:general.nameRow")}
      hint={match(canEdit)
        .with(true, () => t("organization:general.nameHintEditable"))
        .otherwise(() => t("organization:general.nameHintReadOnly"))}
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
        title={t("organization:general.title")}
        description={t("organization:general.description")}
      >
        <OrganizationIdentity organization={props.organization} canEdit={canEdit} />
        <div className="border-border border-t">
          <NameRow {...props} />
          <OrganizationIdentifiers organization={props.organization} />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("organization:general.glance")}
        description={t("organization:general.glanceDescription")}
      >
        <OrganizationCounts />
      </SettingsSection>

      <OrganizationDangerZone role={props.role} organization={props.organization} />
    </div>
  );
}
