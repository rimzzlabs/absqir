import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import { type DataColumn, DataTable } from "@absqir/ui/data-table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import {
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { useDeferredValue, useState } from "react";
import { match, P } from "ts-pattern";
import { ImportDialog } from "@/components/people/import-dialog";
import { PersonAccessCell } from "@/components/people/person-access-cell";
import { PersonDialog } from "@/components/people/person-dialog";
import { PersonRowActions } from "@/components/people/person-row-actions";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";
import { type Person, usePeople } from "@/queries/use-people";

export interface PeoplePageProps {
  role: RoleName;
  /** The signed-in account. Its own row is the one the toggle hides. */
  currentUserId: string | null;
}

/**
 * Every member is also a person, so the reader always finds themselves in the
 * directory. That row is about the reader, not about who they expect at an
 * event, so it stays out of the list until they ask for it.
 */
function isSelf(person: Person, currentUserId: string | null) {
  return currentUserId !== null && person.userId === currentUserId;
}

function NameCell(props: { person: Person; self: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {props.person.name}
      {match(props.self)
        .with(true, () => <Badge variant="secondary">You</Badge>)
        .otherwise(() => null)}
    </span>
  );
}

function GroupsCell(props: { person: Person }) {
  return (
    <div className="flex flex-wrap justify-end gap-1 md:justify-start">
      {match(props.person.groups.length)
        .with(0, () => <span className="text-muted-foreground">—</span>)
        .otherwise(() =>
          A.map(props.person.groups, (group) => (
            <Badge key={group.id} variant="outline">
              {group.name}
            </Badge>
          )),
        )}
    </div>
  );
}

interface Viewer {
  role: RoleName;
  userId: string | null;
}

function actionsColumn(viewer: Viewer): DataColumn<Person> {
  return {
    key: "actions",
    place: "action",
    headClassName: "w-12",
    cell: (person) => (
      <PersonRowActions
        person={person}
        viewerRole={viewer.role}
        isSelf={isSelf(person, viewer.userId)}
      />
    ),
  };
}

function peopleColumns(viewer: Viewer, canManage: boolean): DataColumn<Person>[] {
  const base: DataColumn<Person>[] = [
    {
      key: "name",
      header: "Name",
      place: "primary",
      cell: (person) => <NameCell person={person} self={isSelf(person, viewer.userId)} />,
      cellClassName: "font-medium",
    },
    {
      key: "email",
      header: "Email",
      cell: (person) => person.email ?? "—",
      cellClassName: "text-muted-foreground",
    },
    {
      key: "identifier",
      header: "Identifier",
      cell: (person) => person.identifier ?? "—",
      cellClassName: "font-mono text-xs",
    },
    {
      key: "groups",
      header: "Groups",
      cell: (person) => <GroupsCell person={person} />,
    },
    {
      key: "access",
      header: "Access",
      cell: (person) => (
        <PersonAccessCell
          person={person}
          viewerRole={viewer.role}
          isSelf={isSelf(person, viewer.userId)}
        />
      ),
    },
  ];

  return match(canManage)
    .with(true, () => [...base, actionsColumn(viewer)])
    .otherwise(() => base);
}

function PeopleTable(props: { rows: readonly Person[]; viewer: Viewer; canManage: boolean }) {
  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IdentificationCardIcon />
          </EmptyMedia>
          <EmptyTitle>Nobody here yet</EmptyTitle>
          <EmptyDescription>
            Add the people you expect at your events. Each one can get an invitation to sign in.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <DataTable
      label="People in the directory"
      columns={peopleColumns(props.viewer, props.canManage)}
      rows={props.rows}
      getKey={(person) => person.id}
    />
  );
}

function PeopleBody(props: PeoplePageProps) {
  const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""));
  const [showSelf, setShowSelf] = useQueryState("me", parseAsBoolean.withDefault(false));
  const deferred = useDeferredValue(query.trim());
  const people = usePeople(deferred);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const canManage = props.role === "owner" || props.role === "admin";
  const viewer: Viewer = { role: props.role, userId: props.currentUserId };

  const visible = (rows: readonly Person[]) =>
    match(showSelf)
      .with(true, () => rows)
      .otherwise(() => A.reject(rows, (person) => isSelf(person, props.currentUserId)));

  return (
    <>
      <PageHeader
        title="People"
        description="Everyone the organization expects to see, and what each one can do here."
        actions={match(canManage)
          .with(true, () => (
            <>
              <Button variant="outline" onClick={() => setImporting(true)}>
                <UploadSimpleIcon />
                Import CSV
              </Button>
              <Button onClick={() => setAdding(true)}>
                <PlusIcon />
                Add person
              </Button>
            </>
          ))
          .otherwise(() => null)}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="relative min-w-56 flex-1 sm:max-w-sm sm:flex-none">
          <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search by name, email, or identifier"
            aria-label="Search people"
            className="pl-8"
            value={query}
            onChange={(event) => void setQuery(event.target.value || null)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="people-show-self"
            checked={showSelf}
            onCheckedChange={(checked) => void setShowSelf(checked === true || null)}
          />
          <Label htmlFor="people-show-self" className="text-muted-foreground font-normal">
            Show my own row
          </Label>
        </div>
      </div>

      {match(people)
        .with({ isPending: true }, () => <Skeleton className="h-64 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) => (
          <PeopleTable rows={visible(rows)} viewer={viewer} canManage={canManage} />
        ))
        .otherwise(() => null)}

      <PersonDialog open={adding} onOpenChange={setAdding} person={null} />
      <ImportDialog open={importing} onOpenChange={setImporting} />
    </>
  );
}

export function PeoplePage(props: PeoplePageProps) {
  return (
    <Providers>
      <PeopleBody {...props} />
    </Providers>
  );
}
