import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Input } from "@absqir/ui/input";
import { Skeleton } from "@absqir/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@absqir/ui/table";
import {
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { parseAsString, useQueryState } from "nuqs";
import { useDeferredValue, useState } from "react";
import { match, P } from "ts-pattern";
import { ImportDialog } from "@/components/people/import-dialog";
import { PersonDialog } from "@/components/people/person-dialog";
import { PersonRowActions } from "@/components/people/person-row-actions";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge, type RoleName } from "@/components/shared/role-badge";
import { type Person, usePeople } from "@/queries/use-people";

export interface PeoplePageProps {
  role: RoleName;
}

function StatusBadge(props: { person: Person }) {
  const { person } = props;

  if (person.role) return <RoleBadge role={person.role} />;
  if (person.invited) return <Badge variant="secondary">Invited</Badge>;
  if (person.email) return <Badge variant="outline">Not invited</Badge>;

  return <Badge variant="outline">No email</Badge>;
}

function PeopleTable(props: { rows: Person[]; canManage: boolean }) {
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
    <div className="border-border overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Identifier</TableHead>
            <TableHead>Groups</TableHead>
            <TableHead>Status</TableHead>
            {props.canManage ? <TableHead className="w-12" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.map((person) => (
            <TableRow key={person.id}>
              <TableCell className="font-medium">{person.name}</TableCell>
              <TableCell className="text-muted-foreground">{person.email ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs">{person.identifier ?? "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {person.groups.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    person.groups.map((group) => (
                      <Badge key={group.id} variant="outline">
                        {group.name}
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge person={person} />
              </TableCell>
              {props.canManage ? (
                <TableCell>
                  <PersonRowActions person={person} />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PeopleBody(props: PeoplePageProps) {
  const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""));
  const deferred = useDeferredValue(query.trim());
  const people = usePeople(deferred);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const canManage = props.role === "owner" || props.role === "admin";

  return (
    <>
      <PageHeader
        title="People"
        description="Everyone the organization expects to see. Members with an account can sign in and check in."
        actions={
          canManage ? (
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
          ) : null
        }
      />

      <div className="relative max-w-sm">
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

      {match(people)
        .with({ isPending: true }, () => <Skeleton className="h-64 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) => (
          <PeopleTable rows={rows} canManage={canManage} />
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
