import { useTranslate } from "@absqir/i18n/react";
import { Avatar, AvatarFallback } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { cn } from "@absqir/ui/lib/utils";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@absqir/ui/responsive-dialog";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { UsersThreeIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { initialsOf } from "@/lib/avatar";
import { useSetGroupMembers } from "@/mutations/use-set-group-members";
import { type GroupDetail, useGroup } from "@/queries/use-groups";
import { type Person, useExpectedPeople } from "@/queries/use-people";

export interface GroupMembersDialogProps {
  /** The group to open, or null when the dialog is closed. */
  groupId: string | null;
  onClose: () => void;
  canManage: boolean;
}

/** How many skeleton rows stand in while the list loads. */
const PLACEHOLDER_ROWS = [0, 1, 2, 3];

/** A row is a touch target first. Anything under 44px is hard to hit. */
const ROW = "flex min-h-11 items-center gap-3 px-3 py-2";

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && A.every(a, (id) => b.includes(id));
}

function matches(person: Person, needle: string) {
  return A.some([person.name, person.email ?? "", person.identifier ?? ""], (value) =>
    value.toLowerCase().includes(needle),
  );
}

function PersonLine(props: { name: string; second: string }) {
  return (
    <>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback name={props.name}>{initialsOf(props.name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-normal">{props.name}</span>
        <span className="text-muted-foreground block truncate text-xs">{props.second}</span>
      </span>
    </>
  );
}

/**
 * The people an admin ticks off. The search, the count and the bulk action sit
 * above the scroll so they stay in reach on a long list, and the footer keeps
 * the save where every other dialog puts it.
 */
function MemberPicker(props: { group: GroupDetail; onDone: () => void }) {
  const t = useTranslate();
  const people = useExpectedPeople();
  const save = useSetGroupMembers();
  const initial = useMemo(() => A.map(props.group.members, (row) => row.personId), [props.group]);
  const [selected, setSelected] = useState<readonly string[]>(initial);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSelected(initial);
  }, [initial]);

  const rows = people.data ?? [];
  const needle = query.trim().toLowerCase();
  const shown = match(needle)
    .with(P.string.minLength(1), (needle) => A.filter(rows, (person) => matches(person, needle)))
    .otherwise(() => rows);

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) =>
      match(checked)
        .with(true, () => [...new Set([...current, id])])
        .otherwise(() => A.filter(current, (value) => value !== id)),
    );
  };

  // The bulk action works on what the reader can see. With a search running it
  // adds the matches to the selection instead of replacing it, so a second
  // search does not throw the first one away.
  const shownIds = A.map(shown, (person) => person.id);
  const allShownPicked = shown.length > 0 && A.every(shownIds, (id) => selected.includes(id));
  const bulkLabel = match([needle.length > 0, allShownPicked] as const)
    .with([P._, true], () => t("groups:members.clear"))
    .with([true, false], () => t("groups:members.selectShown", { count: shown.length }))
    .otherwise(() => t("groups:members.selectAll"));

  const runBulk = () =>
    setSelected((current) =>
      match(allShownPicked)
        .with(true, () => A.filter(current, (id) => !shownIds.includes(id)))
        .otherwise(() => [...new Set([...current, ...shownIds])]),
    );

  const dirty = !sameSet(selected, initial);

  return (
    <>
      <div className="flex shrink-0 flex-col gap-3">
        <Input
          type="search"
          placeholder={t("groups:members.filter")}
          aria-label={t("groups:members.filter")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={people.isPending || rows.length === 0}
        />
        <div className="flex items-center justify-between gap-2">
          <p aria-live="polite" className="text-muted-foreground text-sm tabular-nums">
            {t("groups:members.selected", {
              selected: String(selected.length),
              total: String(rows.length),
            })}
          </p>
          {match(shown.length > 0)
            .with(true, () => (
              <Button type="button" variant="ghost" size="sm" onClick={runBulk}>
                {bulkLabel}
              </Button>
            ))
            .otherwise(() => null)}
        </div>
        <FormError error={people.error ?? save.error} />
      </div>

      <ResponsiveDialogBody>
        {match({ pending: people.isPending, total: rows.length, shown: shown.length })
          .with({ pending: true }, () => (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {A.map(PLACEHOLDER_ROWS, (key) => (
                <li key={key} className={ROW}>
                  <Skeleton className="size-4 rounded-sm" />
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </li>
              ))}
            </ul>
          ))
          .with({ total: 0 }, () => (
            <Empty className="border-border rounded-lg border border-dashed py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersThreeIcon />
                </EmptyMedia>
                <EmptyTitle>{t("groups:members.emptyTitle")}</EmptyTitle>
                <EmptyDescription>{t("groups:members.emptyDescription")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ))
          .with({ shown: 0 }, () => (
            <div className="border-border flex flex-col items-center gap-2 rounded-lg border border-dashed py-10">
              <p className="text-muted-foreground text-sm">
                {t("groups:members.nobodyMatches", { query })}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
                {t("groups:members.clearFilter")}
              </Button>
            </div>
          ))
          .otherwise(() => (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {A.map(shown, (person) => {
                const checked = selected.includes(person.id);

                return (
                  <li
                    key={person.id}
                    data-picked={checked}
                    className={cn(ROW, "hover:bg-muted/40 data-[picked=true]:bg-primary/5")}
                  >
                    <Checkbox
                      id={`member-${person.id}`}
                      checked={checked}
                      onCheckedChange={(value) => toggle(person.id, value === true)}
                    />
                    <Label
                      htmlFor={`member-${person.id}`}
                      className="min-h-11 flex-1 cursor-pointer gap-3 font-normal"
                    >
                      <PersonLine
                        name={person.name}
                        second={person.email ?? person.identifier ?? t("groups:members.noEmail")}
                      />
                    </Label>
                  </li>
                );
              })}
            </ul>
          ))}
      </ResponsiveDialogBody>

      <ResponsiveDialogFooter>
        <Button type="button" variant="outline" onClick={props.onDone}>
          {t("common:actions.cancel")}
        </Button>
        <Button
          type="button"
          disabled={!dirty || save.isPending}
          onClick={() =>
            save.mutate(
              { id: props.group.id, personIds: [...selected] },
              { onSuccess: props.onDone },
            )
          }
        >
          {match(save.isPending)
            .with(true, () => t("common:actions.saving"))
            .otherwise(() => t("groups:members.save"))}
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}

/** An organizer reads the group. Only an admin ticks the boxes. */
function MemberRoll(props: { group: GroupDetail; onDone: () => void }) {
  const t = useTranslate();

  return (
    <>
      <ResponsiveDialogBody>
        {match(props.group.members.length)
          .with(0, () => (
            <Empty className="border-border rounded-lg border border-dashed py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersThreeIcon />
                </EmptyMedia>
                <EmptyTitle>{t("groups:members.emptyReadOnly")}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ))
          .otherwise(() => (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {A.map(props.group.members, (row) => (
                <li key={row.personId} className={ROW}>
                  <PersonLine
                    name={row.name}
                    second={row.email ?? row.identifier ?? t("groups:members.noEmail")}
                  />
                </li>
              ))}
            </ul>
          ))}
      </ResponsiveDialogBody>
      <ResponsiveDialogFooter>
        <Button type="button" variant="outline" onClick={props.onDone}>
          {t("groups:members.close")}
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}

export function GroupMembersDialog(props: GroupMembersDialogProps) {
  const t = useTranslate();
  const group = useGroup(props.groupId);

  return (
    <ResponsiveDialog
      open={props.groupId !== null}
      onOpenChange={(open) => !open && props.onClose()}
    >
      <ResponsiveDialogContent className="sm:max-w-lg">
        {match(group)
          .with({ isPending: true }, () => (
            <>
              <ResponsiveDialogHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </ResponsiveDialogHeader>
              <ResponsiveDialogBody>
                <Skeleton className="h-64 rounded-lg" />
              </ResponsiveDialogBody>
            </>
          ))
          .with({ isError: true, error: P.select() }, (error) => (
            <>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>{t("groups:members.fallbackTitle")}</ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <ResponsiveDialogBody>
                <FormError error={error} />
              </ResponsiveDialogBody>
            </>
          ))
          .with({ data: P.select(P.nonNullable) }, (data) => (
            <>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>
                  {t("groups:members.title", { name: data.name })}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {match(props.canManage)
                    .with(true, () => t("groups:members.description"))
                    .otherwise(() => t("groups:members.readOnly"))}
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>

              {match(props.canManage)
                .with(true, () => <MemberPicker group={data} onDone={props.onClose} />)
                .otherwise(() => (
                  <MemberRoll group={data} onDone={props.onClose} />
                ))}
            </>
          ))
          .otherwise(() => null)}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
