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
  const update = useUpdateOrganization();
  const canEdit = props.role === "owner" || props.role === "admin";

  return (
    <SettingsRow
      label="Name and slug"
      hint={match(canEdit)
        .with(
          true,
          () =>
            "The name people read, and the short word that names this organization everywhere else." as const,
        )
        .otherwise(() => "Only owners and admins can change these." as const)}
    >
      <fieldset disabled={!canEdit} className="max-w-md">
        <OrganizationForm
          submitLabel="Save"
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
  const canEdit = props.role === "owner" || props.role === "admin";

  return (
    <div className="space-y-12">
      <SettingsSection
        title="Organization"
        description="The logo and the name people see, and the words that name it in links and on the command line."
      >
        <OrganizationIdentity organization={props.organization} canEdit={canEdit} />
        <div className="border-border border-t">
          <NameRow {...props} />
          <OrganizationIdentifiers organization={props.organization} />
        </div>
      </SettingsSection>

      <SettingsSection title="At a glance" description="How big this organization has become.">
        <OrganizationCounts />
      </SettingsSection>

      <OrganizationDangerZone role={props.role} organization={props.organization} />
    </div>
  );
}
