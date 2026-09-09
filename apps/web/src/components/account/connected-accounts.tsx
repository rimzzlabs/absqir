import { Button } from "@absqir/ui/button";
import { GithubLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { SettingsRow } from "@/components/settings/settings-section";
import { FormError } from "@/components/shared/form-error";
import { authClient } from "@/lib/auth-client";
import {
  type AuthProviderId,
  isAuthProvider,
  providerLabel,
  readCallbackError,
} from "@/lib/auth-providers";
import { useUnlinkProvider } from "@/mutations/use-unlink-provider";
import { useCredentials } from "@/queries/use-credentials";

const ICONS = { github: GithubLogoIcon, google: GoogleLogoIcon } as const;

const RETURN_PATH = "/settings?tab=security";

/**
 * What a failed link left in the address bar. It is read after hydration, so
 * the server render stays the same for every reader, and the parameters are
 * cleared once read: a reload must not repeat a message about a past attempt.
 */
function useLinkFailure(): string | null {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");

    if (!code) return;

    const provider = params.get("provider") ?? "";
    const failure = readCallbackError({
      code,
      description: params.get("error_description"),
      provider: isAuthProvider(provider) ? provider : null,
    });

    setMessage(failure?.message ?? null);

    params.delete("error");
    params.delete("error_description");
    params.delete("provider");

    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  return message;
}

interface ProviderRow {
  provider: AuthProviderId;
  /** The row to remove, or null when this provider is not linked yet. */
  accountId: string | null;
}

/**
 * Every provider the operator turned on, plus any this account still carries
 * from keys that were removed later. Disconnecting the only way in is
 * refused by the server, so the last credential cannot be dropped here.
 */
export function ConnectedAccounts() {
  const credentials = useCredentials();
  const unlink = useUnlinkProvider();
  const linkFailure = useLinkFailure();

  if (!credentials.data) return null;

  const { hasPassword, linked, available } = credentials.data;

  const rows: ProviderRow[] = [...new Set([...available, ...linked.map((row) => row.provider)])]
    .filter(isAuthProvider)
    .map((provider) => ({
      provider,
      accountId: linked.find((row) => row.provider === provider)?.accountId ?? null,
    }));

  if (rows.length === 0) return null;

  const ways = linked.length + (hasPassword ? 1 : 0);

  return (
    <SettingsRow
      label="Connected accounts"
      hint="Sign in with a provider instead of a code. The last way into your account cannot be disconnected."
    >
      <div className="space-y-3">
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map(({ provider, accountId }) => {
            const Icon = ICONS[provider];
            const name = providerLabel(provider);

            return (
              <li key={provider} className="flex items-center gap-3 px-3 py-2.5">
                <Icon weight="fill" className="size-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{name}</p>
                  <p className="text-muted-foreground text-xs">
                    {accountId ? "Connected" : "Not connected"}
                  </p>
                </div>

                {accountId ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={unlink.isPending || ways < 2}
                    onClick={() => unlink.mutate(accountId)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void authClient.linkSocial({
                        provider,
                        callbackURL: RETURN_PATH,
                        // Without this, a refused link lands on Better Auth's
                        // own error page instead of the row that started it.
                        errorCallbackURL: `${RETURN_PATH}&provider=${provider}`,
                      });
                    }}
                  >
                    Connect
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        {linkFailure ? (
          <p role="alert" className="text-destructive text-sm">
            {linkFailure}
          </p>
        ) : null}

        <FormError error={unlink.error} />
      </div>
    </SettingsRow>
  );
}
