import { Button } from "@absqir/ui/button";
import { A } from "@mobily/ts-belt";
import { useState } from "react";
import { match } from "ts-pattern";
import { ProviderIcon } from "@/components/shared/provider-icon";
import { authClient } from "@/lib/auth-client";
import { type AuthProviderId, providerLabel } from "@/lib/auth-providers";

export interface AuthProviderButtonsProps {
  /** The providers the operator turned on. Empty renders nothing at all. */
  providers: readonly AuthProviderId[];
  /** Where to land after the provider sends the reader back. */
  next: string;
}

/**
 * The shortcut under the email field. The email door stays the first thing
 * the page asks for, so these sit below the divider, not above it.
 */
export function AuthProviderButtons(props: AuthProviderButtonsProps) {
  const [pending, setPending] = useState<AuthProviderId | null>(null);

  if (props.providers.length === 0) return null;

  const start = async (provider: AuthProviderId) => {
    setPending(provider);

    // The provider name travels with the error address, so a refusal can
    // name which provider answered.
    const errorCallbackURL = `/sign-in?provider=${provider}&next=${encodeURIComponent(props.next)}`;

    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: props.next,
      errorCallbackURL,
    });

    if (error) setPending(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-muted-foreground text-xs">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-2">
        {A.map(props.providers, (provider) => (
          <Button
            key={provider}
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending !== null}
            onClick={() => {
              void start(provider).catch(() => setPending(null));
            }}
          >
            <ProviderIcon provider={provider} />
            {match(pending === provider)
              .with(true, () => "Opening…" as const)
              .otherwise(() => `Continue with ${providerLabel(provider)}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
