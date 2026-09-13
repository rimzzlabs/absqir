import { useTranslate } from "@absqir/i18n/react";
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
  const t = useTranslate();
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
              .with(true, () => t("common:actions.copied"))
              .otherwise(() => t("common:actions.copy"))}
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
  const t = useTranslate();

  return (
    <>
      <CopyRow
        label={t("settings:organization.slug")}
        hint={t("settings:organization.slugHint")}
        value={props.organization.slug}
      />
      <CopyRow
        label={t("settings:organization.id")}
        hint={t("settings:organization.idHint")}
        value={props.organization.id}
      />
    </>
  );
}
