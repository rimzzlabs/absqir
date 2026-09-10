import { A, pipe } from "@mobily/ts-belt";

/**
 * Reads TXT records over DNS-over-HTTPS. The Workers runtime has no DNS
 * client and the Node build must behave the same way, so both ask a resolver
 * over HTTPS instead.
 */

const RESOLVER = "https://cloudflare-dns.com/dns-query";
const TIMEOUT_MS = 5000;

interface DnsAnswer {
  type: number;
  data: string;
}

interface DnsReply {
  Status: number;
  Answer?: DnsAnswer[];
}

/** TXT record type, by RFC 1035. */
const TXT = 16;

/** Every TXT value on one host. Empty when the host has none, or DNS fails. */
export async function txtRecords(host: string): Promise<readonly string[]> {
  const url = `${RESOLVER}?name=${encodeURIComponent(host)}&type=TXT`;

  try {
    const response = await fetch(url, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) return [];

    const reply = (await response.json()) as DnsReply;
    if (reply.Status !== 0 || !reply.Answer) return [];

    // A resolver hands TXT values back quoted, and a long one arrives split
    // into several quoted strings that belong together.
    return pipe(
      reply.Answer,
      A.filter((answer) => answer.type === TXT),
      A.map((answer) =>
        A.map(answer.data.split('" "'), (part) => part.replace(/^"|"$/g, "")).join(""),
      ),
    );
  } catch {
    return [];
  }
}
