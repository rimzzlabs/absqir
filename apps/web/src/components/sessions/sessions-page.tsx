import { formatRange } from "@absqir/core/date";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { CaretRightIcon, PlusIcon, QrCodeIcon } from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { SessionDialog } from "@/components/sessions/session-dialog";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";
import { SessionStatusBadge } from "@/components/shared/status-badge";
import { type Session, type SessionScope, useSessions } from "@/queries/use-sessions";

export interface SessionsPageProps {
  role: RoleName;
}

function Counts(props: { session: Session }) {
  const { counts, status } = props.session;
  const checkedIn = counts.present + counts.late;

  if (status === "scheduled") {
    return <span className="text-muted-foreground text-xs">{counts.expected} expected</span>;
  }

  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {checkedIn}/{counts.expected} in
      {counts.late > 0 ? ` · ${counts.late} late` : ""}
      {status === "done" && counts.absent > 0 ? ` · ${counts.absent} absent` : ""}
    </span>
  );
}

function SessionList(props: { rows: Session[]; scope: SessionScope }) {
  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <QrCodeIcon />
          </EmptyMedia>
          <EmptyTitle>
            {props.scope === "past" ? "Nothing has happened yet" : "Nothing is planned"}
          </EmptyTitle>
          <EmptyDescription>
            {props.scope === "past"
              ? "Closed sessions land here with their records."
              : "Create a session, or set up a schedule that creates them for you."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="border-border divide-border divide-y rounded-xl border">
      {props.rows.map((session) => (
        <li key={session.id}>
          <a
            href={`/sessions/${session.id}`}
            className="hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-4 p-4 focus-visible:ring-2 focus-visible:outline-none"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {formatRange(new Date(session.startsAt), new Date(session.endsAt))}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {session.groups.map((group) => (
                  <Badge key={group.id} variant="outline">
                    {group.name}
                  </Badge>
                ))}
              </div>
            </div>
            <Counts session={session} />
            <SessionStatusBadge status={session.status} />
            <CaretRightIcon aria-hidden className="text-muted-foreground" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The two tabs. The API also knows "all", which the list never asks for. */
type ListScope = Extract<SessionScope, "upcoming" | "past">;

const SCOPE = parseAsStringLiteral(["upcoming", "past"] as const satisfies ListScope[]).withDefault(
  "upcoming",
);

function SessionsBody(props: SessionsPageProps) {
  const [scope, setScope] = useQueryState("scope", SCOPE);
  const sessions = useSessions(scope);
  const [creating, setCreating] = useState(false);
  const canCreate = props.role !== "member";

  return (
    <>
      <PageHeader
        title="Sessions"
        description="One session is one moment people are expected. It opens and closes on its own clock."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              New session
            </Button>
          ) : null
        }
      />

      <Tabs value={scope} onValueChange={(value) => void setScope(value as ListScope)}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
      </Tabs>

      {match(sessions)
        .with({ isPending: true }, () => <Skeleton className="h-48 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) => (
          <SessionList rows={rows} scope={scope} />
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
