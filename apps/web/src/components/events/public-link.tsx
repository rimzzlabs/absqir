import { Button } from "@absqir/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@absqir/ui/input-group";
import { CheckIcon, CopyIcon, GlobeIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { Event } from "@/queries/use-events";

export interface PublicLinkProps {
  event: Event;
}

/** The registration page's address, ready to paste into an announcement. */
export function PublicLink(props: PublicLinkProps) {
  const { event } = props;
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

  const seats =
    event.registrationLimit === null
      ? `${event.registrationCount} registered`
      : `${event.registrationCount} of ${event.registrationLimit} seats taken`;

  return (
    <div className="border-border space-y-2 rounded-xl border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <GlobeIcon className="text-muted-foreground" />
        Public registration
        <span className="text-muted-foreground font-normal tabular-nums">· {seats}</span>
      </div>
      <InputGroup>
        <InputGroupInput readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
        <InputGroupAddon align="inline-end">
          <Button type="button" size="xs" variant="ghost" onClick={copy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      <p className="text-muted-foreground text-xs">
        Anyone with the link can register. Someone new creates an account and joins as a member.
      </p>
    </div>
  );
}
