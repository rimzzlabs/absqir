import { Button } from "@absqir/ui/button";
import { Input } from "@absqir/ui/input";
import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Providers } from "@/components/providers";
import { useCreateOrganization } from "@/mutations/use-create-organization";
import { useSetActiveOrganization } from "@/mutations/use-set-active-organization";
import { useOrganizations } from "@/queries/use-organizations";
import { useSession } from "@/queries/use-session";

function OrgControls() {
  const session = useSession();
  const organizations = useOrganizations();
  const setActive = useSetActiveOrganization();
  const create = useCreateOrganization();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const rows = organizations.data ?? [];
  // Right after sign-up the session may not carry an active organization yet;
  // the API falls back to the first membership, so the select mirrors that.
  const activeId = session.data?.session.activeOrganizationId ?? rows[0]?.id ?? "";

  const onCreate = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;

    create.mutate(trimmed, {
      onSuccess: () => {
        setName("");
        setCreating(false);
      },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="org-switcher" className="text-muted-foreground text-sm">
        Organization
      </label>

      <select
        id="org-switcher"
        className="border-border bg-background focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
        value={activeId}
        disabled={organizations.isPending || setActive.isPending}
        onChange={(event) => setActive.mutate(event.target.value)}
      >
        {rows.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>

      {creating ? (
        <>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Organization name"
            aria-label="Organization name"
            className="h-9 w-48"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCreate();
              }
            }}
          />
          <Button size="sm" disabled={create.isPending} onClick={onCreate}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
          <PlusIcon />
          New organization
        </Button>
      )}

      {setActive.error || create.error ? (
        <p role="alert" className="text-destructive text-sm">
          {setActive.error?.message ?? create.error?.message}
        </p>
      ) : null}
    </div>
  );
}

export function OrgSwitcher() {
  return (
    <Providers>
      <OrgControls />
    </Providers>
  );
}
