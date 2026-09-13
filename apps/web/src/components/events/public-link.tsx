import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@absqir/ui/input-group";
import { CheckIcon, CopyIcon, GlobeIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { match } from "ts-pattern";
import type { Event } from "@/queries/use-events";

export interface PublicLinkProps {
  event: Event;
}

/** The registration page's address, ready to paste into an announcement. */
export function PublicLink(props: PublicLinkProps) {
  const { event } = props;
  const t = useTranslate();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/e/${event.id}`;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // The field below is selectable; the reader can copy by hand.
    }
  };

  const seats = match(event.registrationLimit)
    .with(null, () => t("events:publicLink.registered", { count: event.registrationCount }))
    .otherwise((registrationLimit) =>
      t("events:publicLink.seats", {
        count: event.registrationCount,
        limit: registrationLimit,
      }),
    );

  return (
    <div className="border-border space-y-2 rounded-xl border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <GlobeIcon className="text-muted-foreground" />
        {t("events:publicLink.title")}
        <span className="text-muted-foreground font-normal tabular-nums">· {seats}</span>
      </div>
      <InputGroup>
        <InputGroupInput readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
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
      <p className="text-muted-foreground text-xs">{t("events:publicLink.hint")}</p>
    </div>
  );
}
