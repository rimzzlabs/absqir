/**
 * The sign-in providers `absqir init` offers. The CLI keeps its own list so
 * the binary stays free of the app packages.
 */
export const PROVIDERS = [
  { id: "github", label: "GitHub", console: "https://github.com/settings/developers" },
  { id: "google", label: "Google", console: "https://console.cloud.google.com/apis/credentials" },
] as const;

export type ProviderId = (typeof PROVIDERS)[number]["id"];

/** The two keys a provider needs, in the order they are written. */
export function keysOf(provider: ProviderId): [string, string] {
  const name = provider.toUpperCase();

  return [`${name}_CLIENT_ID`, `${name}_CLIENT_SECRET`];
}

/** The address to register with the provider. It must match APP_URL. */
export function callbackUrl(appUrl: string, provider: ProviderId): string {
  return `${appUrl.replace(/\/+$/, "")}/api/auth/callback/${provider}`;
}
