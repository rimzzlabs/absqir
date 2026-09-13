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
import { PassDialog } from "@/components/my/pass-dialog";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { type LeaveStatus, LeaveStatusBadge } from "@/components/shared/status-badge";
import { useMyLeave } from "@/queries/use-leave";
import { useMyEvents, useMyHistory } from "@/queries/use-my";

export interface MemberHomePageProps {
  userName: string;
  organizationName: string;
  /** The account's zone. Null follows the device. */
  timezone: string | null;
}

function LeaveCard(props: { pending: number; latest: LeaveStatus | null }) {
  const waitingNote = match(props.pending)
    .with(1, () => "One request waits for a decision." as const)
    .otherwise((pending) => `${pending} requests wait for a decision.`);
  const restingNote = match(props.latest)
    .with(P.string.minLength(1), () => "Your last request.")
    .otherwise(() => "Cannot make an event? Ask before it starts." as const);
  const badge: LeaveStatus | null = match(props.pending > 0)
    .with(true, () => "pending" as const)
    .otherwise(() => props.latest);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotePencilIcon />
          Leave
        </CardTitle>
        <CardDescription>
          {match(props.pending > 0)
            .with(true, () => waitingNote)
            .otherwise(() => restingNote)}
        </CardDescription>
        {match(badge)
          .with(P.string.minLength(1), (badge) => (
            <CardAction>
              <LeaveStatusBadge status={badge} />
            </CardAction>
          ))
          .otherwise(() => null)}
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
  const events = useMyEvents();
  const history = useMyHistory();
  const leave = useMyLeave({ scope: "all" });
  const [passFor, setPassFor] = useState<string | null>(null);

  const rows = A.flatMap(events.data?.pages ?? [], (page) => page.items);
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
              {match(props.timezone)
                .with(P.string.minLength(1), (timezone) => describeTimezone(timezone))
                .otherwise(() => "this device's clock" as const)}
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

      {match(events)
        .with({ isPending: true }, () => <Skeleton className="h-44 rounded-2xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.nonNullable }, () => <MemberHomeNow events={rows} onPass={setPassFor} />)
        .otherwise(() => null)}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <MemberHomeAgenda events={rows} pending={events.isPending} />

        <div className="flex flex-col gap-6">
          {match(history)
            .with({ isPending: true }, () => <Skeleton className="h-72 rounded-xl" />)
            .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
            .with({ data: P.select(P.nonNullable) }, (data) => (
              <MemberHomeStanding history={data} />
            ))
            .otherwise(() => null)}

          {match(leave.isError)
            .with(true, () => <FormError error={leave.error} />)
            .otherwise(() => (
              <LeaveCard pending={pendingLeave} latest={requests[0]?.status ?? null} />
            ))}
        </div>
      </div>

      <PassDialog eventId={passFor} onClose={() => setPassFor(null)} />
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
