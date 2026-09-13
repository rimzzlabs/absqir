import type { Locale, Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Progress } from "@absqir/ui/progress";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
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
  TranslateIcon,
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
  /** The language this reader gets, for every island under it. */
  locale: Locale;
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
    <li
      className={match(locked)
        .with(true, () => "opacity-50")
        .otherwise(() => undefined)}
    >
      <div className="flex items-start gap-3">
        <StepMark state={step.state} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <step.icon aria-hidden className="text-muted-foreground size-4" />
            {step.label}
            {match(locked)
              .with(true, () => <LockSimpleIcon aria-hidden className="size-3.5" />)
              .otherwise(() => null)}
          </p>
          <p className="text-muted-foreground text-sm">{step.hint}</p>
        </div>
      </div>
      {match(Boolean(step.body))
        .with(true, () => <div className="mt-4 ml-8">{step.body}</div>)
        .otherwise(() => null)}
    </li>
  );
}

/** What the second step says depends on what absqir found for this address. */
function joinHint(t: Translate, status: OnboardingStatus): string {
  if (status.joinRequest) {
    return t("home:gettingStarted.joinHintRequest", {
      name: status.joinRequest.organizationName,
    });
  }

  if (status.invitations.length > 0) {
    return t("home:gettingStarted.joinHintInvited");
  }

  const workspace = status.workspace;

  if (workspace) {
    return match(workspace.joinPolicy)
      .with("auto", () =>
        t("home:gettingStarted.joinHintAuto", {
          name: workspace.name,
          domain: workspace.domain,
        }),
      )
      .otherwise(() =>
        t("home:gettingStarted.joinHintWorkspace", {
          name: workspace.name,
          domain: workspace.domain,
        }),
      );
  }

  return t("home:gettingStarted.joinHintNone");
}

function stepsFor(t: Translate, status: OnboardingStatus): Step[] {
  const waiting = status.joinRequest !== null;

  return [
    {
      state: "done",
      label: t("home:gettingStarted.accountReady"),
      hint: t("home:gettingStarted.accountReadyHint", { email: status.email }),
      icon: CheckCircleIcon,
    },
    {
      state: "now",
      label: match(waiting)
        .with(true, () => t("home:gettingStarted.waiting"))
        .otherwise(() => t("home:gettingStarted.join")),
      hint: joinHint(t, status),
      icon: UsersThreeIcon,
      body: <JoinOrganization status={status} variant="waiting" heading={false} />,
    },
    {
      state: "locked",
      label: t("home:gettingStarted.invite"),
      hint: t("home:gettingStarted.inviteHint"),
      icon: IdentificationCardIcon,
    },
    {
      state: "locked",
      label: t("home:gettingStarted.firstEvent"),
      hint: t("home:gettingStarted.firstEventHint"),
      icon: QrCodeIcon,
    },
  ];
}

function GettingStartedBody(props: GettingStartedPageProps) {
  const t = useTranslate();
  const status = useOnboarding();
  const first = props.userName.split(" ")[0] ?? props.userName;

  return (
    <>
      <PageHeader
        title={t("home:gettingStarted.welcome", { name: first })}
        description={t("home:gettingStarted.description")}
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
          const steps = stepsFor(t, data);
          const done = A.filter(steps, (step) => step.state === "done").length;

          return (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <Card>
                <CardHeader>
                  <CardTitle>{t("home:gettingStarted.title")}</CardTitle>
                  <CardDescription>
                    {t("home:gettingStarted.step", {
                      done: String(done + 1),
                      total: String(steps.length),
                    })}
                  </CardDescription>
                  <Progress
                    value={(done / steps.length) * 100}
                    aria-label={t("home:gettingStarted.progressLabel", {
                      done: String(done),
                      total: String(steps.length),
                    })}
                    className="mt-3"
                  />
                </CardHeader>
                <CardContent>
                  <ol className="space-y-6">
                    {A.map(steps, (step) => (
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

/** The key under `home:gettingStarted` that words each one. */
const FEATURES: { icon: Icon; key: "featureQr" | "featureSchedules" | "featureReports" }[] = [
  { icon: QrCodeIcon, key: "featureQr" },
  { icon: RepeatIcon, key: "featureSchedules" },
  { icon: ChartBarIcon, key: "featureReports" },
];

const TIPS: { icon: Icon; key: "tipPublic" | "tipLanguage" | "tipDomain" }[] = [
  { icon: LinkSimpleIcon, key: "tipPublic" },
  { icon: TranslateIcon, key: "tipLanguage" },
  { icon: UsersThreeIcon, key: "tipDomain" },
];

/** The column beside the steps: what absqir is for, and a few things to know. */
function Aside() {
  const t = useTranslate();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("home:gettingStarted.whatYouGet")}</CardTitle>
          <CardDescription>{t("home:gettingStarted.whatYouGetHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {A.map(FEATURES, (feature) => (
              <li key={feature.key} className="flex items-start gap-3">
                <feature.icon aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t(`home:gettingStarted.${feature.key}`)}</p>
                  <p className="text-muted-foreground text-sm">
                    {t(`home:gettingStarted.${feature.key}Hint`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("home:gettingStarted.goodToKnow")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {A.map(TIPS, (tip) => (
              <li key={tip.key} className="text-muted-foreground flex items-start gap-3 text-sm">
                <tip.icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{t(`home:gettingStarted.${tip.key}`)}</span>
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
        {t("home:gettingStarted.openSource")}
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
    <Providers locale={props.locale}>
      <GettingStartedBody {...props} />
    </Providers>
  );
}
