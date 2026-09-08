import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { PlusIcon, QrCodeIcon } from "@phosphor-icons/react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useDeferredValue, useState } from "react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { SessionCard } from "@/components/sessions/session-card";
import { SessionDialog } from "@/components/sessions/session-dialog";
import { SessionsToolbar } from "@/components/sessions/sessions-toolbar";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";
import { type Session, type SessionScope, useSessions } from "@/queries/use-sessions";

export interface SessionsPageProps {
  role: RoleName;
}

/** The two tabs. The API also knows "all", which the list never asks for. */
type ListScope = Extract<SessionScope, "upcoming" | "past">;

const SCOPE = parseAsStringLiteral(["upcoming", "past"] as const satisfies ListScope[]).withDefault(
  "upcoming",
);
const TEXT = parseAsString.withDefault("");

const GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

function SessionGrid(props: { rows: Session[]; scope: ListScope; filtered: boolean }) {
  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <QrCodeIcon />
          </EmptyMedia>
          <EmptyTitle>
            {props.filtered
              ? "Nothing matches"
              : props.scope === "past"
                ? "Nothing has happened yet"
                : "Nothing is planned"}
          </EmptyTitle>
          <EmptyDescription>
            {props.filtered
              ? "Try another title, or every group."
              : props.scope === "past"
                ? "Closed events land here with their records."
                : "Create an event, or set up a schedule that creates them for you."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className={GRID}>
      {props.rows.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </ul>
  );
}

function SessionsBody(props: SessionsPageProps) {
  const [scope, setScope] = useQueryState("scope", SCOPE);
  const [q, setQ] = useQueryState("q", TEXT.withOptions({ throttleMs: 300 }));
  const [groupId, setGroupId] = useQueryState("group", TEXT);
  // The grid follows the typing a beat behind, so every keystroke does not fetch.
  const wanted = useDeferredValue(q.trim());
  const sessions = useSessions({ scope, q: wanted, groupId });
  const rows = sessions.data?.pages.flatMap((page) => page.items) ?? [];
  const [creating, setCreating] = useState(false);
  const canCreate = props.role !== "member";

  return (
    <>
      <PageHeader
        title="Events"
        description="One event is one moment people are expected. It opens and closes on its own clock."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              New event
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={scope} onValueChange={(value) => void setScope(value as ListScope)}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>

        <SessionsToolbar
          q={q}
          onQChange={(value) => void setQ(value)}
          groupId={groupId}
          onGroupChange={(value) => void setGroupId(value)}
        />
      </div>

      {match(sessions)
        .with({ isPending: true }, () => (
          <div className={GRID} aria-busy>
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-44 rounded-xl" />
            ))}
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.nonNullable }, () => (
          <div className="space-y-4">
            <SessionGrid rows={rows} scope={scope} filtered={wanted !== "" || groupId !== ""} />

            {sessions.hasNextPage ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  disabled={sessions.isFetchingNextPage}
                  onClick={() => void sessions.fetchNextPage()}
                >
                  {sessions.isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        ))
        .otherwise(() => null)}

      <SessionDialog open={creating} onOpenChange={setCreating} session={null} />
    </>
  );
}

export function SessionsPage(props: SessionsPageProps) {
  return (
    <Providers>
      <SessionsBody {...props} />
    </Providers>
  );
}
