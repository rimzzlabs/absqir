import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { A } from "@mobily/ts-belt";
import { NotePencilIcon, PlusIcon } from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { match } from "ts-pattern";
import { LeaveRow } from "@/components/leave/leave-row";
import { AskLeaveDialog } from "@/components/my/ask-leave-dialog";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { StickyToolbar } from "@/components/shared/sticky-toolbar";
import { useWithdrawLeave } from "@/mutations/use-withdraw-leave";
import { type LeaveRequest, type LeaveScope, useMyLeave } from "@/queries/use-leave";

/** The same two tabs the organizer's queue has, from the reader's side. */
type MyScope = Extract<LeaveScope, "pending" | "decided">;

const SCOPE = parseAsStringLiteral(["pending", "decided"] as const satisfies MyScope[]).withDefault(
  "pending",
);

const LIST = "flex flex-col gap-2";

/** The one thing a member can still do about a request nobody has answered. */
function Withdraw(props: { id: string }) {
  const t = useTranslate();
  const withdraw = useWithdrawLeave();

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={withdraw.isPending}
        onClick={() => withdraw.mutate(props.id)}
      >
        {match(withdraw.isPending)
          .with(true, () => t("my:leave.withdrawing"))
          .otherwise(() => t("my:leave.withdraw"))}
      </Button>
      <FormError error={withdraw.error} />
    </>
  );
}

function MyLeaveList(props: { rows: readonly LeaveRequest[]; scope: MyScope; onAsk: () => void }) {
  const t = useTranslate();

  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <NotePencilIcon />
          </EmptyMedia>
          <EmptyTitle>
            {match(props.scope)
              .with("pending", () => t("my:leave.waitingEmptyTitle"))
              .otherwise(() => t("my:leave.decidedEmptyTitle"))}
          </EmptyTitle>
          <EmptyDescription>
            {match(props.scope)
              .with("pending", () => t("my:leave.waitingEmpty"))
              .otherwise(() => t("my:leave.decidedEmptyDescription"))}
          </EmptyDescription>
        </EmptyHeader>
        {/* An empty queue is exactly where somebody wants to start one. */}
        {match(props.scope)
          .with("pending", () => (
            <Button variant="outline" onClick={props.onAsk}>
              <PlusIcon />
              {t("my:leave.ask")}
            </Button>
          ))
          .otherwise(() => null)}
      </Empty>
    );
  }

  return (
    <ul className={LIST} aria-label={t("my:leave.listLabel")}>
      {A.map(props.rows, (row) => (
        <LeaveRow
          key={row.id}
          request={row}
          actions={match(row.status)
            .with("pending", () => <Withdraw id={row.id} />)
            .otherwise(() => null)}
        />
      ))}
    </ul>
  );
}

function MyLeaveBody() {
  const t = useTranslate();
  const [scope, setScope] = useQueryState("status", SCOPE);
  const [asking, setAsking] = useState(false);
  const mine = useMyLeave({ scope });
  const rows = A.flatMap(mine.data?.pages ?? [], (page) => page.items);

  return (
    <>
      <PageHeader
        title={t("my:leave.title")}
        description={t("my:leave.description")}
        actions={
          <Button onClick={() => setAsking(true)}>
            <PlusIcon />
            {t("my:leave.ask")}
          </Button>
        }
      />

      <StickyToolbar>
        <Tabs
          value={scope}
          onValueChange={(value) => void setScope(value as MyScope)}
          className="w-full sm:w-auto"
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="pending">{t("my:leave.waiting")}</TabsTrigger>
            <TabsTrigger value="decided">{t("my:leave.decided")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </StickyToolbar>

      {match(mine)
        .with({ isPending: true }, () => (
          <div className={LIST} aria-busy>
            {A.map([0, 1, 2], (key) => (
              <Skeleton key={key} className="h-28 rounded-xl" />
            ))}
          </div>
        ))
        .with({ isError: true }, () => <QueryError query={mine} />)
        .otherwise(() => (
          <div className="space-y-4">
            <MyLeaveList rows={rows} scope={scope} onAsk={() => setAsking(true)} />

            {match(mine.hasNextPage)
              .with(true, () => (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    disabled={mine.isFetchingNextPage}
                    onClick={() => void mine.fetchNextPage()}
                  >
                    {match(mine.isFetchingNextPage)
                      .with(true, () => t("common:actions.loading"))
                      .otherwise(() => t("my:leave.loadMore"))}
                  </Button>
                </div>
              ))
              .otherwise(() => null)}
          </div>
        ))}

      <AskLeaveDialog open={asking} onOpenChange={setAsking} />
    </>
  );
}

export interface MyLeavePageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
}

export function MyLeavePage(props: MyLeavePageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <MyLeaveBody />
    </Providers>
  );
}
