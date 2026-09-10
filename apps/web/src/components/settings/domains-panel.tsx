import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@absqir/ui/field";
import { Input } from "@absqir/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemDescription,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@absqir/ui/select";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { ArrowClockwiseIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import {
  type JoinPolicy,
  useClaimDomain,
  useReleaseDomain,
  useSetJoinPolicy,
  useVerifyDomain,
} from "@/mutations/use-domain-actions";
import { type OrganizationDomain, useDomains } from "@/queries/use-domains";

const POLICY_OPTIONS: { value: JoinPolicy; label: string; hint: string }[] = [
  {
    value: "request",
    label: "Ask first",
    hint: "They send a request. An admin lets them in.",
  },
  {
    value: "auto",
    label: "Straight in",
    hint: "Anyone at a verified domain becomes a member.",
  },
  {
    value: "closed",
    label: "Invitation only",
    hint: "The domain opens nothing. Invitations still work.",
  },
];

function DomainRow(props: { row: OrganizationDomain }) {
  const { row } = props;
  const verify = useVerifyDomain();
  const release = useReleaseDomain();

  return (
    <div className="border-border space-y-3 border-b py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium">{row.domain}</p>
        {row.verified ? (
          <Badge variant="secondary">
            Verified{row.verifiedBy === "email" ? " by email" : " by DNS"}
          </Badge>
        ) : (
          <Badge variant="outline">Waiting for the record</Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          {row.verified ? null : (
            <Button
              size="sm"
              variant="outline"
              disabled={verify.isPending}
              onClick={() => verify.mutate(row.id)}
            >
              <ArrowClockwiseIcon />
              {verify.isPending ? "Checking…" : "Check now"}
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Release ${row.domain}`}
            disabled={release.isPending}
            onClick={() => release.mutate(row.id)}
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      {row.verified ? null : (
        <div className="bg-muted/40 text-muted-foreground rounded-lg p-3 text-sm">
          <p>Add this TXT record, then press Check now.</p>
          <dl className="mt-2 grid gap-1 font-mono text-xs sm:grid-cols-[5rem_minmax(0,1fr)]">
            <dt className="font-sans">Host</dt>
            <dd className="text-foreground break-all">{row.recordHost}</dd>
            <dt className="font-sans">Value</dt>
            <dd className="text-foreground break-all">{row.recordValue}</dd>
          </dl>
        </div>
      )}

      <FormError error={verify.error ?? release.error} />
    </div>
  );
}

function ClaimForm() {
  const [domain, setDomain] = useState("");
  const claim = useClaimDomain();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim a domain</CardTitle>
        <CardDescription>
          A claim starts unverified. Add the TXT record it names, and this workspace owns the
          domain. A mailbox provider such as gmail.com can never be claimed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const value = domain.trim();
            if (value.length > 0) claim.mutate(value, { onSuccess: () => setDomain("") });
          }}
        >
          <Field className="min-w-56 flex-1">
            <FieldLabel htmlFor="claim-domain">Domain</FieldLabel>
            <FieldContent>
              <Input
                id="claim-domain"
                value={domain}
                autoComplete="off"
                placeholder="kolosal.ai"
                onChange={(event) => setDomain(event.target.value)}
              />
            </FieldContent>
          </Field>
          <Button type="submit" disabled={claim.isPending}>
            <PlusIcon />
            {claim.isPending ? "Claiming…" : "Claim"}
          </Button>
        </form>
        <FormError error={claim.error} />
      </CardContent>
    </Card>
  );
}

/** Which domains this workspace owns, and what a matching account may do. */
export function DomainsPanel() {
  const domains = useDomains();
  const setPolicy = useSetJoinPolicy();

  return (
    <div className="space-y-6">
      <ClaimForm />

      {match(domains)
        .with({ isPending: true }, () => <Skeleton className="h-40 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (data) => (
          <>
            <Field>
              <FieldLabel htmlFor="join-policy">People from a verified domain</FieldLabel>
              <FieldContent>
                <Select
                  items={A.map(POLICY_OPTIONS, (option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={data.joinPolicy}
                  disabled={setPolicy.isPending}
                  onValueChange={(value) => {
                    if (value) setPolicy.mutate(value as JoinPolicy);
                  }}
                >
                  <SelectTrigger id="join-policy" className="w-full sm:w-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>When the email domain matches</SelectLabel>
                      {A.map(POLICY_OPTIONS, (option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex flex-col">
                            <span>{option.label}</span>
                            <SelectItemDescription>{option.hint}</SelectItemDescription>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  This decides what happens to a new account whose address ends in a domain below.
                </FieldDescription>
              </FieldContent>
            </Field>

            <FormError error={setPolicy.error} />

            <section className="space-y-1">
              <h2 className="text-sm font-medium">Domains</h2>
              {data.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No domain is claimed. Nobody finds this workspace by their email.
                </p>
              ) : (
                <div className="border-border rounded-xl border px-4">
                  {A.map(data.items, (row) => (
                    <DomainRow key={row.id} row={row} />
                  ))}
                </div>
              )}
            </section>
          </>
        ))
        .otherwise(() => null)}
    </div>
  );
}
