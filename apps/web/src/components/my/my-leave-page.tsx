import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Separator } from "@absqir/ui/separator";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { NotePencilIcon, PlusIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { match, P } from "ts-pattern";
import { AskLeaveDialog } from "@/components/my/ask-leave-dialog";
import { MyLeaveCard } from "@/components/my/my-leave-card";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { type LeaveRequest, useMyLeave } from "@/queries/use-leave";

const GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

/** A rule with a word on it, between the two halves of the page. */
function LabeledDivider(props: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {props.children}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}

function LoadMore(props: { query: ReturnType<typeof useMyLeave> }) {
  if (!props.query.hasNextPage) return null;

  return (
    <div className="flex justify-center">
      <Button
        variant="outline"
        disabled={props.query.isFetchingNextPage}
        onClick={() => void props.query.fetchNextPage()}
      >
        {props.query.isFetchingNextPage ? "Loading…" : "Load more"}
      </Button>
    </div>
  );
}

function Grid(props: { rows: readonly LeaveRequest[] }) {
  return (
    <ul className={GRID}>
      {A.map(props.rows, (request) => (
        <MyLeaveCard key={request.id} request={request} />
      ))}
    </ul>
  );
}

/** The requests an organizer still has to answer. */
function Waiting() {
  const pending = useMyLeave({ scope: "pending" });
  const rows = A.flatMap(pending.data?.pages ?? [], (page) => page.items);

  return (
    <section aria-labelledby="leave-waiting" className="space-y-4">
      <h2 id="leave-waiting" className="font-heading text-lg font-semibold tracking-tight">
        Waiting for a decision
      </h2>

      {match(pending)
        .with({ isPending: true }, () => (
          <div className={GRID} aria-busy>
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.nonNullable }, () =>
          rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing waits. Cannot make an event? Ask before it starts, with a reason.
            </p>
          ) : (
            <>
              <Grid rows={rows} />
              <LoadMore query={pending} />
            </>
          ),
        )
        .otherwise(() => null)}
    </section>
  );
}

/** The requests with an answer, newest first. */
function Decided() {
  const decided = useMyLeave({ scope: "decided" });
  const rows = A.flatMap(decided.data?.pages ?? [], (page) => page.items);

  return (
    <section aria-label="Decided" className="space-y-4">
      {match(decided)
        .with({ isPending: true }, () => (
          <div className={GRID} aria-busy>
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.nonNullable }, () =>
          rows.length === 0 ? (
            <Empty className="border-border rounded-xl border border-dashed py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <NotePencilIcon />
                </EmptyMedia>
                <EmptyTitle>Nothing decided yet</EmptyTitle>
                <EmptyDescription>
                  Approved and declined requests land here, with the organizer's note.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Grid rows={rows} />
              <LoadMore query={decided} />
            </>
          ),
        )
        .otherwise(() => null)}
    </section>
  );
}

function MyLeaveBody() {
  const [asking, setAsking] = useState(false);

  return (
    <>
      <PageHeader
        title="My leave"
        description="Ask to be excused before an event happens, and see what was decided."
        actions={
          <Button onClick={() => setAsking(true)}>
            <PlusIcon />
            Ask for leave
          </Button>
        }
      />

      <Waiting />
      <LabeledDivider>Decided</LabeledDivider>
      <Decided />

      <AskLeaveDialog open={asking} onOpenChange={setAsking} />
    </>
  );
}

export function MyLeavePage() {
  return (
    <Providers>
      <MyLeaveBody />
    </Providers>
  );
}
