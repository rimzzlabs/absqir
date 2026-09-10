import { A, AR, pipe, R } from "@mobily/ts-belt";

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

/** The lookup worked, and the host is not registered at all. Both are answers. */
const NOERROR = 0;
const NXDOMAIN = 3;

/** The lookup never happened. A host with no TXT records is not this. */
export type DnsFailure = "unreachable" | "resolver";

function valuesOf(reply: DnsReply): readonly string[] {
  // A resolver hands TXT values back quoted, and a long one arrives split
  // into several quoted strings that belong together.
  return pipe(
    reply.Answer ?? [],
    A.filter((answer) => answer.type === TXT),
    A.map((answer) =>
      A.map(answer.data.split('" "'), (part) => part.replace(/^"|"$/g, "")).join(""),
    ),
  );
}

/**
 * Every TXT value on one host. `Ok([])` when the host truly carries none, and
 * an `Error` when the lookup itself did not happen, so a caller can never read
 * a resolver outage as a record the operator forgot to add.
 */
export function txtRecords(host: string): AR.AsyncResult<readonly string[], DnsFailure> {
  const url = `${RESOLVER}?name=${encodeURIComponent(host)}&type=TXT`;

  return pipe(
    AR.make(
      fetch(url, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    ),
    // A refused connection, a resolver outage, or the timeout above.
    AR.mapError((): DnsFailure => "unreachable"),
    AR.flatMap(async (response: Response) =>
      response.ok
        ? pipe(
            await R.fromPromise(response.json() as Promise<DnsReply>),
            R.mapError((): DnsFailure => "resolver"),
          )
        : R.Error<DnsFailure>("resolver"),
    ),
    AR.fold((reply: DnsReply) =>
      reply.Status === NOERROR || reply.Status === NXDOMAIN
        ? R.Ok(valuesOf(reply))
        : R.Error<DnsFailure>("resolver"),
    ),
  );
}
