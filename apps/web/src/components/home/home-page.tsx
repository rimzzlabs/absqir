import { Badge } from "@absqir/ui/badge";
import { buttonVariants } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Skeleton } from "@absqir/ui/skeleton";
import {
  CheckCircleIcon,
  CircleIcon,
  IdentificationCardIcon,
  PaperPlaneTiltIcon,
  QrCodeIcon,
  UsersIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { type Organization, useOrganization } from "@/queries/use-organization";

export interface HomePageProps {
  userName: string;
}

function StatCard(props: { label: string; value: number; icon: React.ReactNode; href: string }) {
  return (
    <a href={props.href} className="block">
      <Card className="hover:bg-muted/40 transition-colors">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            {props.icon}
            {props.label}
          </CardDescription>
          <CardTitle className="text-3xl tabular-nums">{props.value}</CardTitle>
        </CardHeader>
      </Card>
    </a>
  );
}

function Checklist(props: { organization: Organization }) {
  const { counts } = props.organization;

  const steps = [
    {
      done: counts.people > 1,
      label: "Add the people you expect to see",
      hint: "Type them in, or import a CSV from your spreadsheet.",
      href: "/people",
    },
    {
      done: counts.groups > 0,
      label: "Put them in groups",
      hint: "Teams, divisions, cohorts. A session will invite a whole group at once.",
      href: "/groups",
    },
    {
      done: counts.members > 1 || counts.pendingInvitations > 0,
      label: "Invite an organizer or two",
      hint: "They run sessions and scan at the door. Admins also manage people.",
      href: "/settings",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up {props.organization.name}</CardTitle>
        <CardDescription>Three steps before the first session.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step) => (
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

function HomeBody(props: HomePageProps) {
  const organization = useOrganization();

  return (
    <>
      <PageHeader
        title={`Hello, ${props.userName.split(" ")[0] ?? props.userName}`}
        description="Where the organization stands today."
      />

      {match(organization)
        .with({ isPending: true }, () => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-28 rounded-xl" />
            ))}
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (data) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="People"
                value={data.counts.people}
                icon={<IdentificationCardIcon />}
                href="/people"
              />
              <StatCard
                label="Groups"
                value={data.counts.groups}
                icon={<UsersThreeIcon />}
                href="/groups"
              />
              <StatCard
                label="Accounts"
                value={data.counts.members}
                icon={<UsersIcon />}
                href="/settings"
              />
              <StatCard
                label="Pending invitations"
                value={data.counts.pendingInvitations}
                icon={<PaperPlaneTiltIcon />}
                href="/settings"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Checklist organization={data} />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCodeIcon />
                    Sessions
                  </CardTitle>
                  <CardDescription>
                    Not here yet. This build lays the foundation: accounts, the directory, groups,
                    and roles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="outline">Phase 2: sessions and attendance</Badge>
                  <p className="text-muted-foreground text-sm">
                    Next comes the session itself: a start and an end, a late threshold, a group
                    that is expected, a QR screen for the room, a scanner for the door, and the
                    present, late, excused, and absent statuses.
                  </p>
                  <a
                    href="/sessions"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    What the module will hold
                  </a>
                </CardContent>
              </Card>
            </div>
          </>
        ))
        .otherwise(() => null)}
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
