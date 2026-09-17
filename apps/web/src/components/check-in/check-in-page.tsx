import { formatDate } from "@absqir/core/date";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button, buttonVariants } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { Reveal } from "@absqir/ui/reveal";
import { Spinner } from "@absqir/ui/spinner";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  QrCodeIcon,
  ScanIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useEffect } from "react";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ReportAction } from "@/components/check-in/report-action";
import { Providers } from "@/components/providers";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { useOrgHref } from "@/lib/org-path";
import { useCheckIn } from "@/mutations/use-check-in";

export interface CheckInPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
  eventId: string;
  /** From the scanned URL. Null when the page was opened by hand. */
  token: string | null;
}

/** The mark above each heading, so the outcome reads before the words do. */
function Mark(props: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={cn(
        "flex size-14 items-center justify-center rounded-full ring-8",
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}

/**
 * The page the room screen's QR code opens. Scanning is the intent, so the
 * check-in fires on load; the reader only sees the result.
 */
function CheckInBody(props: CheckInPageProps) {
  const t = useTranslate();
  const orgHref = useOrgHref();
  const checkIn = useCheckIn();
  const { mutate } = checkIn;

  useEffect(() => {
    if (props.token) mutate({ eventId: props.eventId, token: props.token });
  }, [props.eventId, props.token, mutate]);

  if (!props.token) {
    return (
      <div className="space-y-5">
        <Mark className="bg-muted ring-muted/50">
          <QrCodeIcon className="text-muted-foreground size-7" />
        </Mark>
        <AuthHeading
          title={t("checkin:scanPage.title")}
          description={t("checkin:scanPage.description")}
        />
        <a href={orgHref("/check-in")} className={buttonVariants({ className: "w-full" })}>
          {t("checkin:scanPage.openScanner")}
        </a>
        <a
          href={orgHref("/my/events")}
          className={buttonVariants({ variant: "ghost", className: "w-full" })}
        >
          {t("checkin:result.myEvents")}
        </a>
      </div>
    );
  }

  return match(checkIn)
    .with({ isError: true, error: P.select() }, (error) => (
      <div className="space-y-5">
        <Mark className="bg-destructive/10 ring-destructive/10">
          <WarningCircleIcon weight="fill" className="text-destructive size-8" />
        </Mark>
        <AuthHeading title={t("checkin:scanner.refusedTitle")} description={error.message} />

        {/* The camera on a phone opens this page, so most refusals land here
            rather than in the app's own scanner. The way back belongs here too. */}
        {match(checkIn.locationRefusal)
          .with(P.nonNullable, (refusal) => (
            <ReportAction
              key={refusal.attemptId ?? props.eventId}
              eventId={props.eventId}
              attemptId={refusal.attemptId}
              reportStatus={refusal.reportStatus}
              refusal={error.message}
            />
          ))
          .otherwise(() => null)}

        {/* The token lives in this page's address. Once it has expired a
            reload replays the same dead token and fails the same way, so the
            only honest primary action is a fresh scan. */}
        {match(checkIn.tokenExpired)
          .with(true, () => (
            <a href={orgHref("/check-in")} className={buttonVariants({ className: "w-full" })}>
              <ScanIcon />
              {t("checkin:scanPage.scanAgain")}
            </a>
          ))
          .otherwise(() => (
            <>
              <Button className="w-full" onClick={() => window.location.reload()}>
                <ArrowClockwiseIcon />
                {t("common:actions.tryAgain")}
              </Button>
              <a
                href={orgHref("/check-in")}
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                {t("checkin:scanPage.scanMyself")}
              </a>
            </>
          ))}
        <a
          href={orgHref("/my/events")}
          className={buttonVariants({ variant: "ghost", className: "w-full" })}
        >
          {t("checkin:result.myEvents")}
        </a>
      </div>
    ))
    .with({ data: P.select(P.nonNullable) }, (result) => (
      <Reveal className="space-y-5">
        <Mark className="bg-emerald-500/10 ring-emerald-500/10">
          <CheckCircleIcon weight="fill" className="size-8 text-emerald-500" />
        </Mark>
        <AuthHeading
          title={match(result.already)
            .with(true, () => t("checkin:result.already", { name: result.personName }))
            .otherwise(() => t("checkin:result.welcome", { name: result.personName }))}
          description={result.eventTitle}
        />
        <div className="border-border flex items-center gap-3 rounded-lg border p-3 text-sm">
          <AttendanceStatusBadge status={result.status} />
          <span className="text-muted-foreground tabular-nums">
            {t("checkin:result.inAt", { time: formatDate(new Date(result.checkedInAt), "time") })}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">{t("checkin:result.saved")}</p>
        <a
          href={orgHref("/my/events")}
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          {t("checkin:result.myEvents")}
        </a>
        <a
          href={orgHref("/my/history")}
          className={buttonVariants({ variant: "ghost", className: "w-full" })}
        >
          {t("checkin:result.myHistory")}
        </a>
      </Reveal>
    ))
    .otherwise(() => (
      <div className="space-y-5">
        <Mark className="bg-muted ring-muted/50">
          <Spinner className="text-muted-foreground size-6" />
        </Mark>
        {/* The location step is the slow one and it opens a permission
            prompt, so it says so rather than leaving the reader guessing. */}
        {match(checkIn.stage)
          .with("locating", () => (
            <AuthHeading
              title={t("checkin:scanPage.locatingTitle")}
              description={t("checkin:scanner.locatingHint")}
            />
          ))
          .otherwise(() => (
            <AuthHeading
              title={t("checkin:scanPage.checkingTitle")}
              description={t("checkin:scanPage.checkingHint")}
            />
          ))}
      </div>
    ));
}

export function CheckInPage(props: CheckInPageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <CheckInBody {...props} />
    </Providers>
  );
}
