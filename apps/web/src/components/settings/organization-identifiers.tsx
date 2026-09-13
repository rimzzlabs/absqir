import { Button } from "@absqir/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@absqir/ui/input-group";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { match } from "ts-pattern";
import { SettingsRow } from "@/components/settings/settings-section";

interface CopyRowProps {
  label: string;
  hint: string;
  value: string;
}

function CopyRow(props: CopyRowProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.value);
      setCopied(true);
    } catch {
      // The field is selectable; the reader can copy it by hand.
    }
  };

  return (
    <SettingsRow label={props.label} hint={props.hint}>
      <InputGroup>
        <InputGroupInput
          readOnly
          value={props.value}
          aria-label={props.label}
          className="font-mono"
          onFocus={(event) => event.currentTarget.select()}
        />
        <InputGroupAddon align="inline-end">
          <Button type="button" size="xs" variant="ghost" onClick={copy}>
            {match(copied)
              .with(true, () => <CheckIcon />)
              .otherwise(() => (
                <CopyIcon />
              ))}
            {match(copied)
              .with(true, () => "Copied" as const)
              .otherwise(() => "Copy" as const)}
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </SettingsRow>
  );
}

export interface OrganizationIdentifiersProps {
  organization: { id: string; slug: string };
}

/** The two strings an operator pastes into a terminal or a support ticket. */
export function OrganizationIdentifiers(props: OrganizationIdentifiersProps) {
  return (
    <>
      <CopyRow
        label="Slug"
        hint="The operator names this organization by its slug: absqir member add --org <slug>."
        value={props.organization.slug}
      />
      <CopyRow
        label="Organization ID"
        hint="What the API and the database call it. Quote it when you report a problem."
        value={props.organization.id}
      />
    </>
  );
}
