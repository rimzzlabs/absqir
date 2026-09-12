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
  label: string;
  hint: string;
  icon: Icon;
  read: (counts: Organization["counts"]) => number;
}

const TILES: Tile[] = [
  {
    label: "Members",
    hint: "Accounts that can sign in",
    icon: UsersThreeIcon,
    read: (counts) => counts.members,
  },
  {
    label: "People",
    hint: "Rows in the directory",
    icon: IdentificationCardIcon,
    read: (counts) => counts.people,
  },
  {
    label: "Groups",
    hint: "Who an event expects",
    icon: UsersFourIcon,
    read: (counts) => counts.groups,
  },
  {
    label: "Invitations",
    hint: "Sent and still waiting",
    icon: EnvelopeSimpleIcon,
    read: (counts) => counts.pendingInvitations,
  },
];

/** The size of the organization in four numbers. */
export function OrganizationCounts() {
  const current = useOrganization();

  return match(current)
    .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
    .with({ data: P.select(P.nonNullable) }, (organization) => (
      <dl className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4">
        {A.map(TILES, (tile) => (
          <div key={tile.label} className="border-border rounded-xl border px-4 py-3">
            <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <tile.icon className="size-4 shrink-0" />
              {tile.label}
            </dt>
            <dd className="font-heading mt-1 text-2xl font-semibold tabular-nums">
              {tile.read(organization.counts)}
            </dd>
            <p className="text-muted-foreground mt-0.5 text-xs">{tile.hint}</p>
          </div>
        ))}
      </dl>
    ))
    .otherwise(() => (
      <div className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4">
        {A.map(TILES, (tile) => (
          <Skeleton key={tile.label} className="h-24 rounded-xl" />
        ))}
      </div>
    ));
}
