import { useTranslate } from "@absqir/i18n/react";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@absqir/ui/field";
import { IconAction } from "@absqir/ui/icon-action";
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

const POLICY_OPTIONS: JoinPolicy[] = ["request", "auto", "closed"];

function DomainRow(props: { row: OrganizationDomain }) {
  const { row } = props;
  const t = useTranslate();
  const verify = useVerifyDomain();
  const release = useReleaseDomain();

  return (
    <div className="border-border space-y-3 border-b py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium">{row.domain}</p>
        {match(row.verified)
          .with(true, () => (
            <Badge variant="secondary">
              {t("settings:domains.verified")}
              {match(row.verifiedBy)
                .with("email", () => t("settings:domains.byEmail"))
                .otherwise(() => t("settings:domains.byDns"))}
            </Badge>
          ))
          .otherwise(() => (
            <Badge variant="outline">{t("settings:domains.waiting")}</Badge>
          ))}
        <div className="ml-auto flex items-center gap-2">
          {match(row.verified)
            .with(true, () => null)
            .otherwise(() => (
              <Button
                size="sm"
                variant="outline"
                disabled={verify.isPending}
                onClick={() => verify.mutate(row.id)}
              >
                <ArrowClockwiseIcon />
                {match(verify.isPending)
                  .with(true, () => t("settings:domains.checking"))
                  .otherwise(() => t("settings:domains.checkNow"))}
              </Button>
            ))}
          <IconAction
            variant="ghost"
            label={t("settings:domains.releaseLabel", { domain: row.domain })}
            disabled={release.isPending}
            onClick={() => release.mutate(row.id)}
          >
            <TrashIcon />
          </IconAction>
        </div>
      </div>

      {match(row.verified)
        .with(true, () => null)
        .otherwise(() => (
          <div className="bg-muted/40 text-muted-foreground rounded-lg p-3 text-sm">
            <p>{t("settings:domains.recordHint")}</p>
            <dl className="mt-2 grid gap-1 font-mono text-xs sm:grid-cols-[5rem_minmax(0,1fr)]">
              <dt className="font-sans">{t("settings:domains.host")}</dt>
              <dd className="text-foreground break-all">{row.recordHost}</dd>
              <dt className="font-sans">{t("settings:domains.value")}</dt>
              <dd className="text-foreground break-all">{row.recordValue}</dd>
            </dl>
          </div>
        ))}

      <FormError error={verify.error ?? release.error} />
    </div>
  );
}

function ClaimForm() {
  const t = useTranslate();
  const [domain, setDomain] = useState("");
  const claim = useClaimDomain();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings:domains.claimTitle")}</CardTitle>
        <CardDescription>{t("settings:domains.claimDescription")}</CardDescription>
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
            <FieldLabel htmlFor="claim-domain">{t("settings:domains.domain")}</FieldLabel>
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
            {match(claim.isPending)
              .with(true, () => t("settings:domains.claiming"))
              .otherwise(() => t("settings:domains.claim"))}
          </Button>
        </form>
        <FormError error={claim.error} />
      </CardContent>
    </Card>
  );
}

/** Which domains this workspace owns, and what a matching account may do. */
export function DomainsPanel() {
  const t = useTranslate();
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
              <FieldLabel htmlFor="join-policy">{t("settings:domains.policyLabel")}</FieldLabel>
              <FieldContent>
                <Select
                  items={A.map(POLICY_OPTIONS, (option) => ({
                    value: option,
                    label: t(`settings:domains.policies.${option}`),
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
                      <SelectLabel>{t("settings:domains.policyGroup")}</SelectLabel>
                      {A.map(POLICY_OPTIONS, (option) => (
                        <SelectItem key={option} value={option}>
                          <span className="flex flex-col">
                            <span>{t(`settings:domains.policies.${option}`)}</span>
                            <SelectItemDescription>
                              {t(`settings:domains.policies.${option}Hint`)}
                            </SelectItemDescription>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>{t("settings:domains.policyHint")}</FieldDescription>
              </FieldContent>
            </Field>

            <FormError error={setPolicy.error} />

            <section className="space-y-1">
              <h2 className="text-sm font-medium">{t("settings:domains.listTitle")}</h2>
              {match(data.items.length)
                .with(0, () => (
                  <p className="text-muted-foreground text-sm">{t("settings:domains.empty")}</p>
                ))
                .otherwise(() => (
                  <div className="border-border rounded-xl border px-4">
                    {A.map(data.items, (row) => (
                      <DomainRow key={row.id} row={row} />
                    ))}
                  </div>
                ))}
            </section>
          </>
        ))
        .otherwise(() => null)}
    </div>
  );
}
