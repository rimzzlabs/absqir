import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { QrCodeIcon } from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { AskLeaveDialog } from "@/components/my/ask-leave-dialog";
import { MySessionCard } from "@/components/my/my-session-card";
import { PassDialog } from "@/components/my/pass-dialog";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { type MySession, type MySessionScope, useMySessions } from "@/queries/use-my";

const SCOPE = parseAsStringLiteral([
  "upcoming",
  "past",
] as const satisfies MySessionScope[]).withDefault("upcoming");

const GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

function SessionGrid(props: {
  rows: MySession[];
  scope: MySessionScope;
  onPass: (id: string) => void;
  onAskLeave: (session: MySession) => void;
}) {
  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <QrCodeIcon />
          </EmptyMedia>
          <EmptyTitle>
            {props.scope === "past" ? "Nothing has happened yet" : "Nothing expects you yet"}
          </EmptyTitle>
          <EmptyDescription>
            {props.scope === "past"
              ? "Closed events land here with your record on each."
              : "Events appear here once an organizer plans one for a group you belong to."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className={GRID}>
      {props.rows.map((session) => (
        <MySessionCard
          key={session.id}
          session={session}
          onPass={props.onPass}
          onAskLeave={props.onAskLeave}
        />
      ))}
    </ul>
  );
}

function MySessionsBody() {
  const [scope, setScope] = useQueryState("scope", SCOPE);
  const sessions = useMySessions({ scope });
  const rows = sessions.data?.pages.flatMap((page) => page.items) ?? [];
  const [passFor, setPassFor] = useState<string | null>(null);
  const [leaveFor, setLeaveFor] = useState<MySession | null>(null);

  return (
    <>
      <PageHeader
        title="My events"
        description="Where you are expected. When one runs, scan the screen in the room, or show your pass at the door."
      />

      <Tabs value={scope} onValueChange={(value) => void setScope(value as MySessionScope)}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
      </Tabs>

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
            <SessionGrid rows={rows} scope={scope} onPass={setPassFor} onAskLeave={setLeaveFor} />

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

      <PassDialog sessionId={passFor} onClose={() => setPassFor(null)} />
      <AskLeaveDialog
        open={leaveFor !== null}
        onOpenChange={(open) => !open && setLeaveFor(null)}
        session={leaveFor}
      />
    </>
  );
}

export function MySessionsPage() {
  return (
    <Providers>
      <MySessionsBody />
    </Providers>
  );
}
