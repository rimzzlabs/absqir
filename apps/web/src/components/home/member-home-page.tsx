import { formatDate, formatRange } from "@absqir/core/date";
import { Button, buttonVariants } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Skeleton } from "@absqir/ui/skeleton";
import {
  CaretRightIcon,
  ClockCounterClockwiseIcon,
  MoonIcon,
  NotePencilIcon,
  QrCodeIcon,
  ScanIcon,
  SunHorizonIcon,
  SunIcon,
  TicketIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { greetingFor, useNow } from "@/components/home/use-now";
import { PassDialog } from "@/components/my/pass-dialog";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import {
  AttendanceStatusBadge,
  LeaveStatusBadge,
  SessionStatusBadge,
} from "@/components/shared/status-badge";
import { useMyLeave } from "@/queries/use-leave";
import { type HistoryRow, type MySession, useMyHistory, useMySessions } from "@/queries/use-my";

export interface MemberHomePageProps {
  userName: string;
}

function Greeting(props: { userName: string }) {
  const now = useNow();
  const hour = now?.getHours() ?? 12;
  const TimeIcon = hour < 6 || hour >= 21 ? MoonIcon : hour < 17 ? SunIcon : SunHorizonIcon;
  const firstName = props.userName.split(" ")[0] ?? props.userName;

  return (
    <header className="flex flex-col items-center gap-1 py-6 text-center">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {greetingFor(now)}, {firstName}
      </h1>
      <p className="text-muted-foreground flex min-h-6 items-center gap-1.5 text-sm">
        {now ? (
          <>
            <TimeIcon aria-hidden className="size-4" weight="duotone" />
            {formatDate(now, "longDateTime")}
          </>
        ) : null}
      </p>
    </header>
  );
}

function opensAtOf(session: MySession) {
  return new Date(new Date(session.startsAt).getTime() - session.opensBeforeMinutes * 60_000);
}

/** The one session that matters right now: running, or the next scheduled one. */
function UpNext(props: { sessions: MySession[]; onPass: (id: string) => void }) {
  const next =
    props.sessions.find((row) => row.status === "running") ??
    props.sessions.find((row) => row.status === "scheduled");

  if (!next) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Up next</CardDescription>
          <CardTitle>Nothing expects you right now</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Sessions appear here once an organizer schedules one for a group you belong to.
        </CardContent>
      </Card>
    );
  }

  const running = next.status === "running";

  return (
    <Card className={running ? "ring-primary/50" : undefined}>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          Up next
          <SessionStatusBadge status={next.status} />
        </CardDescription>
        <CardTitle className="text-lg">{next.title}</CardTitle>
        <CardDescription>
          {formatRange(new Date(next.startsAt), new Date(next.endsAt))}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {next.record ? (
          <>
            <AttendanceStatusBadge status={next.record.status} />
            {next.record.checkedInAt ? (
              <span className="text-muted-foreground text-sm tabular-nums">
                at {formatDate(new Date(next.record.checkedInAt), "time")}
              </span>
            ) : null}
          </>
        ) : running ? (
          <>
            <a href="/check-in" className={buttonVariants()}>
              <ScanIcon />
              Check in
            </a>
            <Button variant="outline" onClick={() => props.onPass(next.id)}>
              <TicketIcon />
              My pass
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Check-in opens {formatDate(opensAtOf(next), "weekdayDateTime")}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat(props: { label: string; value: string; href: string; icon: React.ReactNode }) {
  return (
    <a href={props.href} className="block">
      <Card size="sm" className="hover:bg-muted/40 h-full transition-colors">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            {props.icon}
            {props.label}
          </CardDescription>
          <CardTitle className="text-2xl tabular-nums">{props.value}</CardTitle>
        </CardHeader>
      </Card>
    </a>
  );
}

function Stats(props: { history: HistoryRow[]; pendingLeave: number }) {
  const judged = props.history.filter((row) => row.status !== "excused");
  const on = judged.filter((row) => row.status === "present" || row.status === "late").length;
  const rate = judged.length === 0 ? "—" : `${Math.round((on / judged.length) * 100)}%`;
  const late = props.history.filter((row) => row.status === "late").length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Attendance"
        value={rate}
        href="/my/history"
        icon={<ClockCounterClockwiseIcon />}
      />
      <Stat label="Sessions attended" value={String(on)} href="/my/history" icon={<QrCodeIcon />} />
      <Stat label="Late" value={String(late)} href="/my/history" icon={<SunHorizonIcon />} />
      <Stat
        label="Pending leave"
        value={String(props.pendingLeave)}
        href="/my/leave"
        icon={<NotePencilIcon />}
      />
    </div>
  );
}

const PREVIEW = 5;

function ComingUp(props: { sessions: MySession[] }) {
  const rows = props.sessions.filter((row) => row.status !== "done").slice(0, PREVIEW);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCodeIcon />
          Coming up
        </CardTitle>
        <CardDescription>
          {rows.length === 0 ? "Nothing is planned for you." : "Soonest first."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length > 0 ? (
          <ul className="divide-border divide-y">
            {rows.map((session) => (
              <li key={session.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{session.title}</span>
                  <span className="text-muted-foreground block text-xs">
                    {formatRange(new Date(session.startsAt), new Date(session.endsAt))}
                  </span>
                </span>
                <SessionStatusBadge status={session.status} />
              </li>
            ))}
          </ul>
        ) : null}
        <a href="/my/sessions" className={buttonVariants({ variant: "outline", size: "sm" })}>
          My sessions
          <CaretRightIcon />
        </a>
      </CardContent>
    </Card>
  );
}

function Recent(props: { history: HistoryRow[] }) {
  const rows = props.history.slice(0, PREVIEW);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockCounterClockwiseIcon />
          Recent
        </CardTitle>
        <CardDescription>
          {rows.length === 0 ? "No closed session has your name yet." : "Newest first."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length > 0 ? (
          <ul className="divide-border divide-y">
            {rows.map((row) => (
              <li key={row.sessionId} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.title}</span>
                  <span className="text-muted-foreground block text-xs">
                    {formatDate(new Date(row.startsAt), "weekdayDateTime")}
                  </span>
                </span>
                <AttendanceStatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        ) : null}
        <a href="/my/history" className={buttonVariants({ variant: "outline", size: "sm" })}>
          History
          <CaretRightIcon />
        </a>
      </CardContent>
    </Card>
  );
}

function LeaveNote(props: {
  pending: number;
  latestStatus: "pending" | "approved" | "declined" | null;
}) {
  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
      {props.pending > 0 ? (
        <>
          <LeaveStatusBadge status="pending" />
          {props.pending === 1 ? "One leave request" : `${props.pending} leave requests`} waiting
          for a decision.
        </>
      ) : props.latestStatus ? (
        <>
          <LeaveStatusBadge status={props.latestStatus} />
          Your last leave request.
        </>
      ) : (
        "Cannot make it to a session? Ask for leave before it starts."
      )}
      <a href="/my/leave" className="text-foreground underline underline-offset-4">
        My leave
      </a>
    </p>
  );
}

function MemberHomeBody(props: MemberHomePageProps) {
  const sessions = useMySessions();
  const history = useMyHistory();
  const leave = useMyLeave();
  const [passFor, setPassFor] = useState<string | null>(null);
  const pendingLeave = (leave.data ?? []).filter((row) => row.status === "pending").length;

  return (
    <>
      <Greeting userName={props.userName} />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {match(sessions)
          .with({ isPending: true }, () => <Skeleton className="h-36 rounded-xl" />)
          .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
          .with({ data: P.select(P.nonNullable) }, (rows) => (
            <UpNext sessions={rows} onPass={setPassFor} />
          ))
          .otherwise(() => null)}

        {match(history)
          .with({ isPending: true }, () => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-24 rounded-xl" />
              ))}
            </div>
          ))
          .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
          .with({ data: P.select(P.nonNullable) }, (rows) => (
            <Stats history={rows} pendingLeave={pendingLeave} />
          ))
          .otherwise(() => null)}

        <div className="grid gap-4 lg:grid-cols-2">
          <ComingUp sessions={sessions.data ?? []} />
          <Recent history={history.data ?? []} />
        </div>

        {leave.isError ? (
          <FormError error={leave.error} />
        ) : (
          <LeaveNote pending={pendingLeave} latestStatus={leave.data?.[0]?.status ?? null} />
        )}
      </div>

      <PassDialog sessionId={passFor} onClose={() => setPassFor(null)} />
    </>
  );
}

/** A member's front page: the clock, what is next, and how it has gone. */
export function MemberHomePage(props: MemberHomePageProps) {
  return (
    <Providers>
      <MemberHomeBody {...props} />
    </Providers>
  );
}
