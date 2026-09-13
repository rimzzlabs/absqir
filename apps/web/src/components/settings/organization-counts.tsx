import { formatNumber } from "@absqir/core/numbers";
import { useTranslate } from "@absqir/i18n/react";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import {
  EnvelopeSimpleIcon,
  type Icon,
  IdentificationCardIcon,
  UsersFourIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { type Organization, useOrganization } from "@/queries/use-organization";

interface Tile {
  /** The key under `settings:organization.counts` that names the tile. */
  key: "members" | "people" | "groups" | "invitations";
  icon: Icon;
  read: (counts: Organization["counts"]) => number;
}

const TILES: Tile[] = [
  { key: "members", icon: UsersThreeIcon, read: (counts) => counts.members },
  { key: "people", icon: IdentificationCardIcon, read: (counts) => counts.people },
  { key: "groups", icon: UsersFourIcon, read: (counts) => counts.groups },
  {
    key: "invitations",
    icon: EnvelopeSimpleIcon,
    read: (counts) => counts.pendingInvitations,
  },
];

/** The size of the organization in four numbers. */
export function OrganizationCounts() {
  const t = useTranslate();
  const current = useOrganization();

  return match(current)
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (organization) => (
      <dl className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4">
        {A.map(TILES, (tile) => (
          <div key={tile.key} className="border-border rounded-xl border px-4 py-3">
            <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <tile.icon className="size-4 shrink-0" />
              {t(`settings:organization.counts.${tile.key}`)}
            </dt>
            <dd className="font-heading mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(tile.read(organization.counts))}
            </dd>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t(`settings:organization.counts.${tile.key}Hint`)}
            </p>
          </div>
        ))}
      </dl>
    ))
    .otherwise(() => (
      <div className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4">
        {A.map(TILES, (tile) => (
          <Skeleton key={tile.key} className="h-24 rounded-xl" />
        ))}
      </div>
    ));
}
