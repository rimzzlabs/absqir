import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@absqir/ui/item";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { CaretRightIcon, PlusIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { GroupDialog } from "@/components/groups/group-dialog";
import { GroupSheet } from "@/components/groups/group-sheet";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";
import { type Group, useGroups } from "@/queries/use-groups";

export interface GroupsPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  role: RoleName;
}

/**
 * A group is a name, a count, and one line of description. A card spreads
 * those three across a tile and leaves the rest empty, so the list stays a
 * list at every width and the reader scans one column instead of three.
 */
function GroupList(props: { rows: readonly Group[]; onOpen: (id: string) => void }) {
  const t = useTranslate();

  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersThreeIcon />
          </EmptyMedia>
          <EmptyTitle>{t("groups:emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("groups:emptyDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul aria-label={t("groups:title")} className="flex flex-col gap-2">
      {A.map(props.rows, (group) => (
        <li key={group.id}>
          <Item
            variant="outline"
            render={<button type="button" />}
            className="hover:bg-muted/40 w-full text-left"
            onClick={() => props.onOpen(group.id)}
          >
            <ItemMedia variant="icon" className="bg-muted text-muted-foreground size-9 rounded-lg">
              <UsersThreeIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{group.name}</ItemTitle>
              <ItemDescription>
                {match(group.description)
                  .with(P.string.minLength(1), (description) => description)
                  .otherwise(() => t("groups:sheet.noDescription"))}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Badge variant="outline" className="tabular-nums">
                {t("common:people", { count: group.memberCount })}
              </Badge>
              <CaretRightIcon aria-hidden className="text-muted-foreground size-4" />
            </ItemActions>
          </Item>
        </li>
      ))}
    </ul>
  );
}

function GroupsBody(props: GroupsPageProps) {
  const t = useTranslate();
  const groups = useGroups();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const canManage = props.role === "owner" || props.role === "admin";

  return (
    <>
      <PageHeader
        title={t("groups:title")}
        description={t("groups:description")}
        actions={match(canManage)
          .with(true, () => (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              {t("groups:new")}
            </Button>
          ))
          .otherwise(() => null)}
      />

      {match(groups)
        .with({ isPending: true }, () => (
          <div className="flex flex-col gap-2">
            {A.map([0, 1, 2], (key) => (
              <Skeleton key={key} className="h-16 rounded-lg" />
            ))}
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) => (
          <GroupList rows={rows} onOpen={setOpenId} />
        ))
        .otherwise(() => null)}

      <GroupDialog open={creating} onOpenChange={setCreating} group={null} />
      <GroupSheet groupId={openId} onClose={() => setOpenId(null)} canManage={canManage} />
    </>
  );
}

export function GroupsPage(props: GroupsPageProps) {
  return (
    <Providers locale={props.locale}>
      <GroupsBody {...props} />
    </Providers>
  );
}
