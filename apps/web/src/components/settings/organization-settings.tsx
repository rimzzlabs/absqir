import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { FormError } from "@/components/shared/form-error";
import { OrganizationForm } from "@/components/shared/organization-form";
import type { RoleName } from "@/components/shared/role-badge";
import { useUpdateOrganization } from "@/mutations/use-update-organization";

export interface OrganizationSettingsProps {
  role: RoleName;
  organization: { id: string; name: string; slug: string };
}

export function OrganizationSettings(props: OrganizationSettingsProps) {
  const update = useUpdateOrganization();
  const canEdit = props.role === "owner" || props.role === "admin";

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>
          The name people see, and the slug that appears in links.
          {canEdit ? "" : " Only admins can change these."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset disabled={!canEdit} className="space-y-4">
          <OrganizationForm
            submitLabel="Save"
            pending={update.isPending}
            defaultValues={{ name: props.organization.name, slug: props.organization.slug }}
            onSubmit={(values) =>
              update.mutate({ organizationId: props.organization.id, ...values })
            }
          />
        </fieldset>
        <FormError error={update.error} />
      </CardContent>
    </Card>
  );
}
