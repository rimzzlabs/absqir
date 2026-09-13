import type { RiskReason } from "@absqir/core/location-risk";
import type { ApiBindings } from "#src/bindings";

/**
 * Where a paid device-intelligence service plugs in.
 *
 * Everything absqir computes itself is in `@absqir/core/location-risk`, and
 * that module is honest about its ceiling: a web page cannot see the Android
 * mock-location flag, and it cannot see an override made through the
 * developer-tools protocol. A commercial service can, because it ships a
 * native mobile SDK and keeps an address-reputation database. Fingerprint Pro
 * is the one worth naming: it has an explicit location-spoofing signal, VPN
 * detection, and root, jailbreak, and emulator detection.
 *
 * absqir ships none of that, on purpose. It is self-hostable and open source,
 * so it must work with no account anywhere. This interface exists so an
 * operator who wants the stronger signal can add an adapter without touching
 * the check-in path, and so the check-in path was written with that shape in
 * mind from the start.
 *
 * An adapter returns extra reasons to fold into the score. It never returns a
 * verdict: the decision stays here, where it can be read and tested.
 */
export interface RiskProvider {
  name: string;
  inspect(input: RiskProviderInput): Promise<RiskReason[]>;
}

export interface RiskProviderInput {
  /** Whatever token the page collected for the provider, if any. */
  clientToken: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * No provider ships with absqir, so this is always null today. An operator
 * who adds one returns it from here, reading its key off the bindings.
 */
export function resolveRiskProvider(_bindings: ApiBindings): RiskProvider | null {
  return null;
}
