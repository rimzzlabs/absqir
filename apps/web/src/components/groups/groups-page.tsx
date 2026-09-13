import { Button } from "@absqir/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { PlusIcon, UsersThreeIcon } from "@phosphor-icons/react";
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
  role: RoleName;
}

function GroupCards(props: { rows: readonly Group[]; onOpen: (id: string) => void }) {
  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersThreeIcon />
          </EmptyMedia>
          <EmptyTitle>No groups yet</EmptyTitle>
          <EmptyDescription>
            A group is a team, a division, a class, or a cohort. An event expects a group, and
            everyone in it who does not check in is marked absent.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {A.map(props.rows, (group) => (
        <button
          key={group.id}
          type="button"
          className="focus-visible:ring-ring rounded-xl text-left focus-visible:ring-2 focus-visible:outline-none"
          onClick={() => props.onOpen(group.id)}
        >
          <Card className="hover:bg-muted/40 h-full transition-colors">
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
              <CardDescription>
                {group.memberCount}{" "}
                {match(group.memberCount)
                  .with(1, () => "person" as const)
                  .otherwise(() => "people" as const)}
                {match(group.description)
                  .with(P.string.minLength(1), (description) => ` · ${description}`)
                  .otherwise(() => "" as const)}
              </CardDescription>
            </CardHeader>
          </Card>
        </button>
      ))}
    </div>
  );
}

function GroupsBody(props: GroupsPageProps) {
  const groups = useGroups();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const canManage = props.role === "owner" || props.role === "admin";

  return (
    <>
      <PageHeader
        title="Groups"
        description="Who is expected where. Events in the next phase invite a whole group at once."
        actions={match(canManage)
          .with(true, () => (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              New group
            </Button>
          ))
          .otherwise(() => null)}
      />

      {match(groups)
        .with({ isPending: true }, () => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {A.map([0, 1, 2], (key) => (
              <Skeleton key={key} className="h-24 rounded-xl" />
            ))}
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) => (
          <GroupCards rows={rows} onOpen={setOpenId} />
        ))
        .otherwise(() => null)}

      <GroupDialog open={creating} onOpenChange={setCreating} group={null} />
      <GroupSheet groupId={openId} onClose={() => setOpenId(null)} canManage={canManage} />
    </>
  );
}

export function GroupsPage(props: GroupsPageProps) {
  return (
    <Providers>
      <GroupsBody {...props} />
    </Providers>
  );
}
