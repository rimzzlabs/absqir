import { describeTimezone } from "@absqir/core/timezone";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
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
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { type LeaveStatus, LeaveStatusBadge } from "@/components/shared/status-badge";
import { useOrgHref } from "@/lib/org-path";
import { useMyLeave } from "@/queries/use-leave";
import { EMPTY_HISTORY_SUMMARY, useMyEvents, useMyHistory } from "@/queries/use-my";

export interface MemberHomePageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
  userName: string;
  organizationName: string;
  /** The account's zone. Null follows the device. */
  timezone: string | null;
}

function LeaveCard(props: { pending: number; latest: LeaveStatus | null }) {
  const t = useTranslate();
  const orgHref = useOrgHref();
  const waitingNote = t("home:member.leaveWaiting", { count: props.pending });
  const restingNote = match(props.latest)
    .with(P.string.minLength(1), () => t("home:member.leaveLatest"))
    .otherwise(() => t("home:member.leaveResting"));
  const badge: LeaveStatus | null = match(props.pending > 0)
    .with(true, () => "pending" as const)
    .otherwise(() => props.latest);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotePencilIcon />
          {t("home:member.leave")}
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
        <a
          href={orgHref("/my/leave")}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("home:member.myLeave")}
          <CaretRightIcon />
        </a>
      </CardContent>
    </Card>
  );
}

function MemberHomeBody(props: MemberHomePageProps) {
  const t = useTranslate();
  const orgHref = useOrgHref();
  const events = useMyEvents();
  // Enough rows for the standing card's short list; the counts beside it
  // come from the summary, which reads every closed event.
  const history = useMyHistory({ q: "", status: "", when: "any", limit: 5 });
  const leave = useMyLeave({ scope: "all" });
  const [passFor, setPassFor] = useState<string | null>(null);

  const rows = A.flatMap(events.data?.pages ?? [], (page) => page.items);
  const requests = A.flatMap(leave.data?.pages ?? [], (page) => page.items);
  const pendingLeave = A.filter(requests, (row) => row.status === "pending").length;
  const firstName = props.userName.split(" ")[0] ?? props.userName;

  return (
    <>
      <PageHeader
        title={t("home:hello", { name: firstName })}
        description={
          <>
            {t("home:member.readIn", { organization: props.organizationName })}{" "}
            <a
              href="/settings?tab=profile"
              className="text-foreground underline underline-offset-4"
            >
              {match(props.timezone)
                .with(P.string.minLength(1), (timezone) => describeTimezone(timezone))
                .otherwise(() => t("home:member.deviceClock"))}
            </a>
            .
          </>
        }
        actions={
          <a href={orgHref("/check-in")} className={buttonVariants()}>
            <ScanIcon />
            {t("home:member.checkIn")}
          </a>
        }
      />

      {match(events)
        .with({ isPending: true }, () => <Skeleton className="h-44 rounded-2xl" />)
        .with({ isError: true }, () => <QueryError query={events} />)
        .with({ data: P.nonNullable }, () => <MemberHomeNow events={rows} onPass={setPassFor} />)
        .otherwise(() => null)}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <MemberHomeAgenda events={rows} pending={events.isPending} />

        <div className="flex flex-col gap-6">
          {match(history)
            .with({ isPending: true }, () => <Skeleton className="h-72 rounded-xl" />)
            .with({ isError: true }, () => <QueryError query={history} />)
            .with({ data: P.select(P.nonNullable) }, (data) => (
              <MemberHomeStanding
                summary={data.pages[0]?.summary ?? EMPTY_HISTORY_SUMMARY}
                recent={A.flatMap(data.pages, (page) => page.items)}
              />
            ))
            .otherwise(() => null)}

          {match(leave.isError)
            .with(true, () => <QueryError query={leave} />)
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
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <MemberHomeBody {...props} />
    </Providers>
  );
}
