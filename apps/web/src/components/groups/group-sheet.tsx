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
import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@absqir/ui/sheet";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { match, P } from "ts-pattern";
import { GroupDialog } from "@/components/groups/group-dialog";
import { FormError } from "@/components/shared/form-error";
import { useRemoveGroup } from "@/mutations/use-remove-group";
import { useSetGroupMembers } from "@/mutations/use-set-group-members";
import { type GroupDetail, useGroup } from "@/queries/use-groups";
import { usePeople } from "@/queries/use-people";

export interface GroupSheetProps {
  groupId: string | null;
  onClose: () => void;
  canManage: boolean;
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && A.every(a, (id) => b.includes(id));
}

/** A searchable checklist of the directory. Simple, keyboard friendly, no surprises. */
function MemberPicker(props: { group: GroupDetail; canManage: boolean }) {
  const people = usePeople();
  const save = useSetGroupMembers();
  const initial = useMemo(() => A.map(props.group.members, (row) => row.personId), [props.group]);
  const [selected, setSelected] = useState<readonly string[]>(initial);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSelected(initial);
  }, [initial]);

  const rows = A.filter(people.data ?? [], (person) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;

    return A.some([person.name, person.email ?? "", person.identifier ?? ""], (value) =>
      value.toLowerCase().includes(needle),
    );
  });

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) =>
      checked ? [...new Set([...current, id])] : A.filter(current, (value) => value !== id),
    );
  };

  const dirty = !sameSet(selected, initial);

  return (
    <>
      {/* The count, the save button and the filter stay put. Only the list scrolls. */}
      <div className="flex shrink-0 flex-col gap-3 px-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {selected.length} {selected.length === 1 ? "person" : "people"}
          </p>
          {props.canManage && dirty ? (
            <Button
              size="sm"
              disabled={save.isPending}
              onClick={() => save.mutate({ id: props.group.id, personIds: [...selected] })}
            >
              {save.isPending ? "Saving…" : "Save members"}
            </Button>
          ) : null}
        </div>

        {props.canManage ? (
          <Input
            type="search"
            placeholder="Filter the directory"
            aria-label="Filter the directory"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        ) : null}

        <FormError error={people.error ?? save.error} />
      </div>

      <SheetBody>
        <ul className="border-border divide-border divide-y rounded-lg border">
          {people.isPending ? (
            <li className="p-3">
              <Skeleton className="h-5 w-40" />
            </li>
          ) : null}
          {A.map(rows, (person) => {
            const checked = selected.includes(person.id);
            if (!props.canManage && !checked) return null;

            return (
              <li key={person.id} className="flex items-center gap-3 px-3 py-2">
                {props.canManage ? (
                  <Checkbox
                    id={`member-${person.id}`}
                    checked={checked}
                    onCheckedChange={(value) => toggle(person.id, value === true)}
                  />
                ) : null}
                <Label
                  htmlFor={`member-${person.id}`}
                  className="flex-1 cursor-pointer font-normal"
                >
                  <span className="block">{person.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    {person.email ?? person.identifier ?? "no email"}
                  </span>
                </Label>
              </li>
            );
          })}
          {!people.isPending && rows.length === 0 ? (
            <li className="text-muted-foreground p-3 text-sm">Nobody matches.</li>
          ) : null}
        </ul>
      </SheetBody>
    </>
  );
}

export function GroupSheet(props: GroupSheetProps) {
  const group = useGroup(props.groupId);
  const remove = useRemoveGroup();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);

  return (
    <Sheet open={props.groupId !== null} onOpenChange={(open) => !open && props.onClose()}>
      <SheetContent className="flex flex-col sm:max-w-md">
        {match(group)
          .with({ isPending: true }, () => (
            <SheetHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </SheetHeader>
          ))
          .with({ isError: true, error: P.select() }, (error) => (
            <SheetHeader>
              <SheetTitle>Group</SheetTitle>
              <FormError error={error} />
            </SheetHeader>
          ))
          .with({ data: P.select(P.nonNullable) }, (data) => (
            <>
              <SheetHeader>
                <SheetTitle>{data.name}</SheetTitle>
                <SheetDescription>{data.description ?? "No description."}</SheetDescription>
              </SheetHeader>

              <MemberPicker group={data} canManage={props.canManage} />

              {props.canManage ? (
                <SheetFooter className="flex-row justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <PencilSimpleIcon />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setRemoving(true)}>
                    <TrashIcon />
                    Delete
                  </Button>
                </SheetFooter>
              ) : null}

              <GroupDialog open={editing} onOpenChange={setEditing} group={data} />

              <AlertDialog open={removing} onOpenChange={setRemoving}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {data.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The people stay in the directory. Only the group goes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <FormError error={remove.error} />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={remove.isPending}
                      onClick={() =>
                        remove.mutate(data.id, {
                          onSuccess: () => {
                            setRemoving(false);
                            props.onClose();
                          },
                        })
                      }
                    >
                      {remove.isPending ? "Deleting…" : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ))
          .otherwise(() => null)}
      </SheetContent>
    </Sheet>
  );
}
