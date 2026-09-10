import { describeTimezone } from "@absqir/core/timezone";
import { buttonVariants } from "@absqir/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@absqir/ui/card";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { CaretRightIcon, NotePencilIcon, ScanIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { MemberHomeAgenda } from "@/components/home/member-home-agenda";
import { MemberHomeNow } from "@/components/home/member-home-now";
import { MemberHomeStanding } from "@/components/home/member-home-standing";
import { AskLeaveDialog } from "@/components/my/ask-leave-dialog";
import { PassDialog } from "@/components/my/pass-dialog";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { type LeaveStatus, LeaveStatusBadge } from "@/components/shared/status-badge";
import { useMyLeave } from "@/queries/use-leave";
import { type MySession, useMyHistory, useMySessions } from "@/queries/use-my";

export interface MemberHomePageProps {
  userName: string;
  organizationName: string;
  /** The account's zone. Null follows the device. */
  timezone: string | null;
}

function LeaveCard(props: { pending: number; latest: LeaveStatus | null }) {
  const waitingNote =
    props.pending === 1
      ? "One request waits for a decision."
      : `${props.pending} requests wait for a decision.`;
  const restingNote = props.latest
    ? "Your last request."
    : "Cannot make an event? Ask before it starts.";
  const badge: LeaveStatus | null = props.pending > 0 ? "pending" : props.latest;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotePencilIcon />
          Leave
        </CardTitle>
        <CardDescription>{props.pending > 0 ? waitingNote : restingNote}</CardDescription>
        {badge ? (
          <CardAction>
            <LeaveStatusBadge status={badge} />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <a href="/my/leave" className={buttonVariants({ variant: "outline", size: "sm" })}>
          My leave
          <CaretRightIcon />
        </a>
      </CardContent>
    </Card>
  );
}

function MemberHomeBody(props: MemberHomePageProps) {
  const sessions = useMySessions();
  const history = useMyHistory();
  const leave = useMyLeave({ scope: "all" });
  const [passFor, setPassFor] = useState<string | null>(null);
  const [leaveFor, setLeaveFor] = useState<MySession | null>(null);

  const rows = A.flatMap(sessions.data?.pages ?? [], (page) => page.items);
  const requests = A.flatMap(leave.data?.pages ?? [], (page) => page.items);
  const pendingLeave = A.filter(requests, (row) => row.status === "pending").length;
  const firstName = props.userName.split(" ")[0] ?? props.userName;

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName}`}
        description={
          <>
            {props.organizationName}. Times read in{" "}
            <a
              href="/settings?tab=profile"
              className="text-foreground underline underline-offset-4"
            >
              {props.timezone ? describeTimezone(props.timezone) : "this device's clock"}
            </a>
            .
          </>
        }
        actions={
          <a href="/check-in" className={buttonVariants()}>
            <ScanIcon />
            Check in
          </a>
        }
      />

      {match(sessions)
        .with({ isPending: true }, () => <Skeleton className="h-44 rounded-2xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.nonNullable }, () => <MemberHomeNow sessions={rows} onPass={setPassFor} />)
        .otherwise(() => null)}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <MemberHomeAgenda
          sessions={rows}
          pending={sessions.isPending}
          onPass={setPassFor}
          onAskLeave={setLeaveFor}
        />

        <div className="flex flex-col gap-6">
          {match(history)
            .with({ isPending: true }, () => <Skeleton className="h-72 rounded-xl" />)
            .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
            .with({ data: P.select(P.nonNullable) }, (data) => (
              <MemberHomeStanding history={data} />
            ))
            .otherwise(() => null)}

          {leave.isError ? (
            <FormError error={leave.error} />
          ) : (
            <LeaveCard pending={pendingLeave} latest={requests[0]?.status ?? null} />
          )}
        </div>
      </div>

      <PassDialog sessionId={passFor} onClose={() => setPassFor(null)} />
      <AskLeaveDialog
        open={leaveFor !== null}
        onOpenChange={(open) => !open && setLeaveFor(null)}
        session={leaveFor}
      />
    </>
  );
}

/** A member's front page: what runs now, the days ahead, and how it has gone. */
export function MemberHomePage(props: MemberHomePageProps) {
  return (
    <Providers>
      <MemberHomeBody {...props} />
    </Providers>
  );
}
