import { formatRange } from "@absqir/core/date";
import { claimableDomainOfEmail } from "@absqir/core/email-domain";
import { formatNumber } from "@absqir/core/numbers";
import type { Locale, Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
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
  /** The language this reader gets, for every island under it. */
  locale: Locale;
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
  const t = useTranslate();
  const links = [
    { label: t("home:groups", { count: props.counts.groups }), href: "/groups" },
    {
      label: t("home:accounts", { count: props.counts.members }),
      href: "/settings?tab=members",
    },
  ];

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {A.mapWithIndex(links, (index, link) => (
        <span key={link.href} className="flex items-center gap-2">
          {match(index > 0)
            .with(true, () => <span aria-hidden>·</span>)
            .otherwise(() => null)}
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
  const t = useTranslate();

  if (props.pending === 0) return null;

  return (
    <p className="text-muted-foreground text-sm">
      {t("home:invitationsWaiting", { count: props.pending })}{" "}
      <a href="/settings?tab=invitations" className="text-foreground underline underline-offset-4">
        {t("home:reviewInvitations")}
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
  const t = useTranslate();
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
      <Stat
        label={t("home:stats.events")}
        value={formatNumber(data.events)}
        hint={t("home:stats.eventsHint", { count: data.closedEvents })}
      />
      <Stat
        label={t("home:stats.people")}
        value={formatNumber(data.people)}
        hint={t("home:stats.peopleHint")}
      />
      <Stat
        label={t("home:stats.attendance")}
        value={ratePercent(data.attendanceRate)}
        hint={t("home:stats.attendanceHint")}
      />
      <Stat
        label={t("home:stats.onTime")}
        value={ratePercent(data.punctualityRate)}
        hint={t("home:stats.onTimeHint")}
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

function stepsOf(t: Translate, organization: Organization): Step[] {
  const { counts } = organization;

  return [
    {
      done: counts.groups > 0,
      label: t("home:setup.groups"),
      hint: t("home:setup.groupsHint"),
      href: "/groups",
    },
    {
      done: counts.members > 1 || counts.pendingInvitations > 0,
      label: t("home:setup.organizers"),
      hint: t("home:setup.organizersHint"),
      href: "/settings?tab=invitations",
    },
  ];
}

function SetupSteps(props: { organization: Organization; steps: Step[] }) {
  const t = useTranslate();

  // A finished list has nothing left to say, so the card goes away.
  if (A.every(props.steps, (step) => step.done)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("home:setup.title", { name: props.organization.name })}</CardTitle>
        <CardDescription>{t("home:setup.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {A.map(props.steps, (step) => (
            <li key={step.label} className="flex items-start gap-3">
              {match(step.done)
                .with(true, () => (
                  <CheckCircleIcon weight="fill" className="mt-0.5 size-5 text-emerald-500" />
                ))
                .otherwise(() => (
                  <CircleIcon className="text-muted-foreground mt-0.5 size-5" />
                ))}
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
  const t = useTranslate();
  const domains = useDomains();
  const claimable = claimableDomainOfEmail(props.userEmail);
  const steps = stepsOf(t, props.organization);

  // Without the list there is no way to know the domain is unclaimed, and a
  // step that is already done must not appear at all.
  const claimed =
    domains.data !== undefined &&
    claimable !== null &&
    A.some(domains.data.items, (item) => item.domain === claimable);

  if (claimable !== null && domains.data !== undefined && !claimed) {
    steps.push({
      done: false,
      label: t("home:setup.claim", { domain: claimable }),
      hint: t("home:setup.claimHint"),
      href: "/settings?tab=domains",
    });
  }

  return <SetupSteps organization={props.organization} steps={steps} />;
}

function Setup(props: { organization: Organization; userEmail: string }) {
  const t = useTranslate();
  const { role } = props.organization;

  if (role === "owner" || role === "admin") return <AdminSetup {...props} />;

  return <SetupSteps organization={props.organization} steps={stepsOf(t, props.organization)} />;
}

function UpcomingEvents() {
  const t = useTranslate();
  const events = useEvents({ scope: "upcoming", q: "", groupId: "" });
  const rows = (events.data?.pages[0]?.items ?? []).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCodeIcon />
          {t("home:upcoming.title")}
        </CardTitle>
        <CardDescription>
          {match(rows.length)
            .with(0, () => t("home:upcoming.empty"))
            .otherwise(() => t("home:upcoming.hint"))}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {match(events.isError)
          .with(true, () => <FormError error={events.error} />)
          .otherwise(() => null)}
        {match(rows.length > 0)
          .with(true, () => (
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
          ))
          .otherwise(() => null)}
        <div className="flex gap-2">
          <a href="/events" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {t("home:upcoming.allEvents")}
          </a>
          <a href="/schedules" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("home:upcoming.schedules")}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function HomeBody(props: HomePageProps) {
  const t = useTranslate();
  const organization = useOrganization();

  return (
    <>
      <PageHeader
        title={t("home:hello", { name: props.userName.split(" ")[0] ?? props.userName })}
        description={match(organization.data)
          .with(P.nullish, () => t("home:fallbackDescription"))
          .otherwise((data) => <CountLinks counts={data.counts} />)}
      />

      {match(organization.isError)
        .with(true, () => <FormError error={organization.error} />)
        .otherwise(() => null)}
      {match(organization.data)
        .with(P.nullish, () => null)
        .otherwise((data) => (
          <InvitationPrompt pending={data.counts.pendingInvitations} />
        ))}

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
    <Providers locale={props.locale}>
      <HomeBody {...props} />
    </Providers>
  );
}
