import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Progress } from "@absqir/ui/progress";
import { Skeleton } from "@absqir/ui/skeleton";
import {
  ArrowSquareOutIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  CircleIcon,
  GithubLogoIcon,
  type Icon,
  IdentificationCardIcon,
  LinkSimpleIcon,
  LockSimpleIcon,
  QrCodeIcon,
  RepeatIcon,
  UploadSimpleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { match, P } from "ts-pattern";
import { GITHUB_URL } from "@/components/app-shell/nav";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { JoinOrganization } from "@/components/shared/join-organization";
import { PageHeader } from "@/components/shared/page-header";
import { type OnboardingStatus, useOnboarding } from "@/queries/use-onboarding";

export interface GettingStartedPageProps {
  userName: string;
}

type StepState = "done" | "now" | "locked";

interface Step {
  state: StepState;
  label: string;
  hint: string;
  icon: Icon;
  /** Rendered under the step while it is the one to do. */
  body?: ReactNode;
}

function StepMark(props: { state: StepState }) {
  return match(props.state)
    .with("done", () => (
      <CheckCircleIcon weight="fill" className="mt-0.5 size-5 shrink-0 text-emerald-500" />
    ))
    .with("now", () => <CircleDashedIcon className="text-primary mt-0.5 size-5 shrink-0" />)
    .otherwise(() => <CircleIcon className="text-muted-foreground/40 mt-0.5 size-5 shrink-0" />);
}

function StepRow(props: { step: Step }) {
  const { step } = props;
  const locked = step.state === "locked";

  return (
    <li className={locked ? "opacity-50" : undefined}>
      <div className="flex items-start gap-3">
        <StepMark state={step.state} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <step.icon aria-hidden className="text-muted-foreground size-4" />
            {step.label}
            {locked ? <LockSimpleIcon aria-hidden className="size-3.5" /> : null}
          </p>
          <p className="text-muted-foreground text-sm">{step.hint}</p>
        </div>
      </div>
      {step.body ? <div className="mt-4 ml-8">{step.body}</div> : null}
    </li>
  );
}

/** What the second step says depends on what absqir found for this address. */
function joinHint(status: OnboardingStatus): string {
  if (status.joinRequest) {
    return `${status.joinRequest.organizationName} decides, and absqir tells you the moment they do.`;
  }

  if (status.invitations.length > 0) {
    return "An invitation is waiting for you. Accept it and you are in.";
  }

  const workspace = status.workspace;

  if (workspace) {
    return workspace.joinPolicy === "auto"
      ? `${workspace.name} is on absqir, and everybody at ${workspace.domain} can come straight in.`
      : `${workspace.name} is on absqir and takes people from ${workspace.domain}.`;
  }

  return "An organization holds the people, the events, and the attendance.";
}

function stepsFor(status: OnboardingStatus): Step[] {
  const waiting = status.joinRequest !== null;

  return [
    {
      state: "done",
      label: "Your account is ready",
      hint: `You are signed in as ${status.email}.`,
      icon: CheckCircleIcon,
    },
    {
      state: "now",
      label: waiting ? "Waiting on an organizer" : "Join or start an organization",
      hint: joinHint(status),
      icon: UsersThreeIcon,
      body: <JoinOrganization status={status} variant="waiting" heading={false} />,
    },
    {
      state: "locked",
      label: "Add the people you expect to see",
      hint: "Type them in one by one, or import a CSV from your spreadsheet.",
      icon: IdentificationCardIcon,
    },
    {
      state: "locked",
      label: "Run your first event",
      hint: "A QR code on screen, a scanner at the door, and the register writes itself.",
      icon: QrCodeIcon,
    },
  ];
}

function GettingStartedBody(props: GettingStartedPageProps) {
  const status = useOnboarding();
  const first = props.userName.split(" ")[0] ?? props.userName;

  return (
    <>
      <PageHeader
        title={`Welcome, ${first}`}
        description="Four steps to your first register. You are on the second."
      />

      {match(status)
        .with({ isPending: true }, () => (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (data) => {
          const steps = stepsFor(data);
          const done = steps.filter((step) => step.state === "done").length;

          return (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <Card>
                <CardHeader>
                  <CardTitle>Getting started</CardTitle>
                  <CardDescription>
                    Step {done + 1} of {steps.length}
                  </CardDescription>
                  <Progress
                    value={(done / steps.length) * 100}
                    aria-label={`${done} of ${steps.length} steps done`}
                    className="mt-3"
                  />
                </CardHeader>
                <CardContent>
                  <ol className="space-y-6">
                    {steps.map((step) => (
                      <StepRow key={step.label} step={step} />
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Aside />
            </div>
          );
        })
        .otherwise(() => null)}
    </>
  );
}

const FEATURES: { icon: Icon; title: string; hint: string }[] = [
  {
    icon: QrCodeIcon,
    title: "Check in by QR",
    hint: "A code on screen that rotates every few seconds, or a scanner at the door for a queue.",
  },
  {
    icon: RepeatIcon,
    title: "Schedules that plan themselves",
    hint: "One rule creates every Monday standup, and invites the whole group with it.",
  },
  {
    icon: ChartBarIcon,
    title: "Reports you can hand over",
    hint: "Present, late, excused, absent, per person or per group. Export it as CSV.",
  },
];

const TIPS: { icon: Icon; text: string }[] = [
  {
    icon: LinkSimpleIcon,
    text: "An open event has a public link. Whoever opens it can register themselves, with no invitation.",
  },
  {
    icon: UploadSimpleIcon,
    text: "Bring your people over in one go. A CSV from your spreadsheet is enough.",
  },
  {
    icon: UsersThreeIcon,
    text: "An organization can claim its email domain, so a new colleague finds it without being asked in.",
  },
];

/** The column beside the steps: what absqir is for, and a few things to know. */
function Aside() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What you get</CardTitle>
          <CardDescription>Once you are in an organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3">
                <feature.icon aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="text-muted-foreground text-sm">{feature.hint}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Good to know</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {TIPS.map((tip) => (
              <li key={tip.text} className="text-muted-foreground flex items-start gap-3 text-sm">
                <tip.icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{tip.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:text-foreground flex items-center gap-2 px-1 text-sm transition-colors"
      >
        <GithubLogoIcon weight="fill" className="size-4" />
        absqir is open source. Read it on GitHub.
        <ArrowSquareOutIcon aria-hidden className="size-3.5" />
      </a>
    </div>
  );
}

/**
 * What an account sees before it belongs anywhere. The frame around it is the
 * real dashboard, cut back to the entries that work, so the shape of absqir
 * is visible from the first minute.
 */
export function GettingStartedPage(props: GettingStartedPageProps) {
  return (
    <Providers>
      <GettingStartedBody {...props} />
    </Providers>
  );
}
