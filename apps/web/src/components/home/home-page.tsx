import { formatRange } from "@absqir/core/date";
import { claimableDomainOfEmail } from "@absqir/core/email-domain";
import { buttonVariants } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { CheckCircleIcon, CircleIcon, QrCodeIcon } from "@phosphor-icons/react";
import { lazy, Suspense } from "react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { ratePercent } from "@/components/reports/report-summary";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { EventStatusBadge } from "@/components/shared/status-badge";
import { presetRange } from "@/lib/report-window";
import { useDomains } from "@/queries/use-domains";
import { useEvents } from "@/queries/use-events";
import { type Organization, useOrganization } from "@/queries/use-organization";
import {
  type ReportRange,
  useReportEvents,
  useReportGroups,
  useReportSummary,
} from "@/queries/use-reports";

export interface HomePageProps {
  userName: string;
  /** The reader's own address. It decides whether a domain is theirs to claim. */
  userEmail: string;
}

/**
 * Nothing on the front page imports recharts until the island mounts, and a
 * reader who never sees the dashboard never downloads it.
 */
const HomeCharts = lazy(() => import("@/components/home/home-charts"));

/** One fixed window for every number here. The reports page owns the controls. */
const RANGE: ReportRange = { ...presetRange("30d"), groupId: null };

interface Step {
  done: boolean;
  label: string;
  hint: string;
  href: string;
}

function CountLinks(props: { counts: Organization["counts"] }) {
  const links = [
    {
      label: props.counts.people === 1 ? "1 person" : `${props.counts.people} people`,
      href: "/people",
    },
    {
      label: props.counts.groups === 1 ? "1 group" : `${props.counts.groups} groups`,
      href: "/groups",
    },
    {
      label: props.counts.members === 1 ? "1 account" : `${props.counts.members} accounts`,
      href: "/settings?tab=members",
    },
  ];

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {A.mapWithIndex(links, (index, link) => (
        <span key={link.href} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden>·</span> : null}
          <a href={link.href} className="hover:text-foreground underline underline-offset-4">
            {link.label}
          </a>
        </span>
      ))}
    </span>
  );
}

/** Waiting invitations are a prompt, not a number to stare at. */
function InvitationPrompt(props: { pending: number }) {
  if (props.pending === 0) return null;

  const line =
    props.pending === 1
      ? "One invitation is still waiting to be accepted."
      : `${props.pending} invitations are still waiting to be accepted.`;

  return (
    <p className="text-muted-foreground text-sm">
      {line}{" "}
      <a href="/settings?tab=invitations" className="text-foreground underline underline-offset-4">
        Review them
      </a>
      .
    </p>
  );
}

function Stat(props: { label: string; value: string; hint: string }) {
  return (
    <a href="/reports" className="block">
      <Card className="hover:bg-muted/40 h-full transition-colors">
        <CardHeader>
          <CardDescription>{props.label}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{props.value}</CardTitle>
          <p className="text-muted-foreground text-xs">{props.hint}</p>
        </CardHeader>
      </Card>
    </a>
  );
}

const STAT_GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";

/** What the last thirty days came to. The same four measures as the report. */
function ThirtyDayStats() {
  const summary = useReportSummary(RANGE);

  if (summary.isError) return <FormError error={summary.error} />;

  if (!summary.data) {
    return (
      <div className={STAT_GRID} aria-busy>
        {A.map([0, 1, 2, 3], (key) => (
          <Skeleton key={key} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  const data = summary.data;

  return (
    <div className={STAT_GRID}>
      <Stat label="Events" value={String(data.events)} hint={`${data.closedEvents} closed`} />
      <Stat label="People seen" value={String(data.people)} hint="In the last 30 days" />
      <Stat
        label="Attendance"
        value={ratePercent(data.attendanceRate)}
        hint="Present or late, over everyone judged"
      />
      <Stat
        label="On time"
        value={ratePercent(data.punctualityRate)}
        hint="Of those who turned up, who beat the late mark"
      />
    </div>
  );
}

function Charts() {
  const byEvent = useReportEvents(RANGE);
  const byGroup = useReportGroups(RANGE);
  const skeletons = (
    <>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </>
  );

  if (byEvent.isError || byGroup.isError) {
    return <FormError error={byEvent.error ?? byGroup.error} />;
  }

  if (!byEvent.data || !byGroup.data) return skeletons;

  return (
    <Suspense fallback={skeletons}>
      <HomeCharts events={byEvent.data} groups={byGroup.data} />
    </Suspense>
  );
}

function stepsOf(organization: Organization): Step[] {
  const { counts } = organization;

  return [
    {
      done: counts.people > 1,
      label: "Add the people you expect to see",
      hint: "Type them in, or import a CSV from your spreadsheet.",
      href: "/people",
    },
    {
      done: counts.groups > 0,
      label: "Put them in groups",
      hint: "Teams, divisions, cohorts. An event will invite a whole group at once.",
      href: "/groups",
    },
    {
      done: counts.members > 1 || counts.pendingInvitations > 0,
      label: "Invite an organizer or two",
      hint: "They run events and scan at the door. Admins also manage people.",
      href: "/settings?tab=members",
    },
  ];
}

function SetupSteps(props: { organization: Organization; steps: Step[] }) {
  // A finished list has nothing left to say, so the card goes away.
  if (A.every(props.steps, (step) => step.done)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up {props.organization.name}</CardTitle>
        <CardDescription>What is left before the next event.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {A.map(props.steps, (step) => (
            <li key={step.label} className="flex items-start gap-3">
              {step.done ? (
                <CheckCircleIcon weight="fill" className="mt-0.5 size-5 text-emerald-500" />
              ) : (
                <CircleIcon className="text-muted-foreground mt-0.5 size-5" />
              )}
              <div className="flex-1">
                <a href={step.href} className="text-sm font-medium hover:underline">
                  {step.label}
                </a>
                <p className="text-muted-foreground text-sm">{step.hint}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/**
 * An owner or an admin may claim the domain their own address sits on, so the
 * list gains that step. `/organizations/domains` refuses a lower role, which
 * is why this component renders for those two only.
 */
function AdminSetup(props: { organization: Organization; userEmail: string }) {
  const domains = useDomains();
  const claimable = claimableDomainOfEmail(props.userEmail);
  const steps = stepsOf(props.organization);

  // Without the list there is no way to know the domain is unclaimed, and a
  // step that is already done must not appear at all.
  const claimed =
    domains.data !== undefined &&
    claimable !== null &&
    A.some(domains.data.items, (item) => item.domain === claimable);

  if (claimable !== null && domains.data !== undefined && !claimed) {
    steps.push({
      done: false,
      label: `Claim ${claimable}`,
      hint: "A new account at that domain then finds this workspace on its own.",
      href: "/settings?tab=domains",
    });
  }

  return <SetupSteps organization={props.organization} steps={steps} />;
}

function Setup(props: { organization: Organization; userEmail: string }) {
  const { role } = props.organization;

  if (role === "owner" || role === "admin") return <AdminSetup {...props} />;

  return <SetupSteps organization={props.organization} steps={stepsOf(props.organization)} />;
}

function UpcomingEvents() {
  const events = useEvents({ scope: "upcoming", q: "", groupId: "" });
  const rows = (events.data?.pages[0]?.items ?? []).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCodeIcon />
          Next events
        </CardTitle>
        <CardDescription>
          {rows.length === 0
            ? "Nothing is planned. Create an event, or a schedule that creates them for you."
            : "Soonest first. Running ones accept check-ins now."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.isError ? <FormError error={events.error} /> : null}
        {rows.length > 0 ? (
          <ul className="divide-border divide-y">
            {A.map(rows, (event) => (
              <li key={event.id}>
                <a
                  href={`/events/${event.id}`}
                  className="flex items-center gap-3 py-2 text-sm hover:underline"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{event.title}</span>
                    <span className="text-muted-foreground block text-xs">
                      {formatRange(new Date(event.startsAt), new Date(event.endsAt))}
                    </span>
                  </span>
                  <EventStatusBadge status={event.status} />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex gap-2">
          <a href="/events" className={buttonVariants({ variant: "outline", size: "sm" })}>
            All events
          </a>
          <a href="/schedules" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Schedules
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function HomeBody(props: HomePageProps) {
  const organization = useOrganization();

  return (
    <>
      <PageHeader
        title={`Hello, ${props.userName.split(" ")[0] ?? props.userName}`}
        description={
          organization.data ? (
            <CountLinks counts={organization.data.counts} />
          ) : (
            "Where the organization stands today."
          )
        }
      />

      {organization.isError ? <FormError error={organization.error} /> : null}
      {organization.data ? (
        <InvitationPrompt pending={organization.data.counts.pendingInvitations} />
      ) : null}

      <ThirtyDayStats />

      <div className="grid gap-4 lg:grid-cols-2">
        <Charts />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingEvents />

        {match(organization)
          .with({ data: P.select(P.nonNullable) }, (data) => (
            <Setup organization={data} userEmail={props.userEmail} />
          ))
          .otherwise(() => null)}
      </div>
    </>
  );
}

export function HomePage(props: HomePageProps) {
  return (
    <Providers>
      <HomeBody {...props} />
    </Providers>
  );
}
