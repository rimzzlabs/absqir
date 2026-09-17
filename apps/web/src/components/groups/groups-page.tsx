import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@absqir/ui/alert-dialog";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@absqir/ui/dropdown-menu";
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
import {
  CaretRightIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { GroupDialog } from "@/components/groups/group-dialog";
import { GroupMembersDialog } from "@/components/groups/group-members-dialog";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";
import { useRemoveGroup } from "@/mutations/use-remove-group";
import { type Group, useGroups } from "@/queries/use-groups";

export interface GroupsPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
  role: RoleName;
}

interface RowActions {
  onOpen: (id: string) => void;
  onEdit: (group: Group) => void;
  onRemove: (group: Group) => void;
}

/**
 * A group is a name, a count, and one line of description. The row opens the
 * people it holds, and the housekeeping of the group itself folds into one
 * menu, so the reader answers "who is in this" with a single press.
 */
function GroupRow(props: { group: Group; canManage: boolean } & RowActions) {
  const t = useTranslate();
  const { group } = props;

  return (
    <Item variant="outline" className="hover:bg-muted/40 relative">
      <ItemMedia variant="icon" className="bg-muted text-muted-foreground size-9 rounded-lg">
        <UsersThreeIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {/* The button covers the row, so the whole tile opens the people. The
              menu sits above it and keeps its own press. */}
          <button
            type="button"
            onClick={() => props.onOpen(group.id)}
            className="text-left after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
          >
            {group.name}
            <span className="sr-only">{` — ${t("groups:managePeople")}`}</span>
          </button>
        </ItemTitle>
        <ItemDescription>
          {match(group.description)
            .with(P.string.minLength(1), (description) => description)
            .otherwise(() => t("groups:noDescription"))}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant="outline" className="tabular-nums">
          {t("common:people", { count: group.memberCount })}
        </Badge>
        {match(props.canManage)
          .with(true, () => (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("groups:more")}
                    className="relative"
                  />
                }
              >
                <DotsThreeIcon weight="bold" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => props.onOpen(group.id)}>
                  <UsersThreeIcon />
                  {t("groups:managePeople")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => props.onEdit(group)}>
                  <PencilSimpleIcon />
                  {t("common:actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => props.onRemove(group)}>
                  <TrashIcon />
                  {t("common:actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ))
          .otherwise(() => (
            <CaretRightIcon aria-hidden className="text-muted-foreground size-4" />
          ))}
      </ItemActions>
    </Item>
  );
}

function GroupList(props: { rows: readonly Group[]; canManage: boolean } & RowActions) {
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
          <GroupRow
            group={group}
            canManage={props.canManage}
            onOpen={props.onOpen}
            onEdit={props.onEdit}
            onRemove={props.onRemove}
          />
        </li>
      ))}
    </ul>
  );
}

/** The one place a group goes away. The people it held stay in the directory. */
function RemoveGroupDialog(props: { group: Group | null; onClose: () => void }) {
  const t = useTranslate();
  const remove = useRemoveGroup();
  const name = props.group?.name ?? "";

  return (
    <AlertDialog open={props.group !== null} onOpenChange={(open) => !open && props.onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("groups:remove.title", { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("groups:remove.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <FormError error={remove.error} />
        <AlertDialogFooter>
          <AlertDialogCancel>{t("groups:remove.keep")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending || props.group === null}
            onClick={() =>
              match(props.group)
                .with(P.nonNullable, (group) =>
                  remove.mutate(group.id, { onSuccess: props.onClose }),
                )
                .otherwise(() => undefined)
            }
          >
            {match(remove.isPending)
              .with(true, () => t("groups:remove.deleting"))
              .otherwise(() => t("common:actions.delete"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function GroupsBody(props: GroupsPageProps) {
  const t = useTranslate();
  const groups = useGroups();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [removing, setRemoving] = useState<Group | null>(null);
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
          <GroupList
            rows={rows}
            canManage={canManage}
            onOpen={setOpenId}
            onEdit={setEditing}
            onRemove={setRemoving}
          />
        ))
        .otherwise(() => null)}

      <GroupDialog open={creating} onOpenChange={setCreating} group={null} />
      <GroupDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        group={editing}
      />
      <RemoveGroupDialog group={removing} onClose={() => setRemoving(null)} />
      <GroupMembersDialog groupId={openId} onClose={() => setOpenId(null)} canManage={canManage} />
    </>
  );
}

export function GroupsPage(props: GroupsPageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <GroupsBody {...props} />
    </Providers>
  );
}
