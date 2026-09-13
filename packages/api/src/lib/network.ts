import { A } from "@mobily/ts-belt";
import { match, P } from "ts-pattern";

/**
 * What the edge knows about where a request came from.
 *
 * Cloudflare fills `request.cf` on every Worker invocation at no cost, so the
 * check-in gets a second opinion on the member's position for free. The Node
 * and Docker target has no such object, and a self-host behind its own proxy
 * has nothing either. Every field is therefore nullable, and a null means
 * "this runtime cannot tell", never "clean".
 */
export interface NetworkReading {
  position: { latitude: number; longitude: number } | null;
  /** True for a hosting or VPN network. Null when nothing can say. */
  relay: boolean | null;
  asn: number | null;
  organization: string | null;
}

export const UNKNOWN_NETWORK: NetworkReading = {
  position: null,
  relay: null,
  asn: null,
  organization: null,
};

/** The shape Cloudflare puts on the request. Absent everywhere else. */
interface CloudflareProperties {
  latitude?: string;
  longitude?: string;
  asn?: number;
  asOrganization?: string;
}

/**
 * Networks that sell exits rather than serve homes and offices. A match is a
 * hint worth twenty points, never a refusal, because a real company can route
 * its staff through a cloud, and a VPN not on this list goes unnoticed. A
 * paid address-intelligence provider answers this properly; see
 * `risk-provider.ts` for where one plugs in.
 */
const RELAY_MARKERS = [
  "amazon",
  "aws",
  "azure",
  "choopa",
  "cogent",
  "contabo",
  "datacamp",
  "digitalocean",
  "google cloud",
  "hetzner",
  "leaseweb",
  "linode",
  "m247",
  "nordvpn",
  "ovh",
  "packethub",
  "privateinternetaccess",
  "surfshark",
  "vultr",
  "expressvpn",
] as const;

function looksLikeRelay(organization: string): boolean {
  const name = organization.toLowerCase();

  return A.some(RELAY_MARKERS, (marker) => name.includes(marker));
}

function readNumber(value: string | undefined): number | null {
  return match(value)
    .with(P.string.minLength(1), (text) => {
      const parsed = Number(text);

      return match(Number.isFinite(parsed))
        .with(true, () => parsed)
        .otherwise(() => null);
    })
    .otherwise(() => null);
}

export function readNetwork(request: Request): NetworkReading {
  const cf = (request as Request & { cf?: CloudflareProperties }).cf;
  if (!cf) return UNKNOWN_NETWORK;

  const latitude = readNumber(cf.latitude);
  const longitude = readNumber(cf.longitude);
  const organization = cf.asOrganization ?? null;

  return {
    position: match([latitude, longitude])
      .with([P.number, P.number], ([lat, lon]) => ({ latitude: lat, longitude: lon }))
      .otherwise(() => null),
    relay: match(organization)
      .with(P.string.minLength(1), (name) => looksLikeRelay(name))
      .otherwise(() => null),
    asn: cf.asn ?? null,
    organization,
  };
}
