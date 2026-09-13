import { formatDate } from "@absqir/core/date";
import { Button, buttonVariants } from "@absqir/ui/button";
import { cn } from "@absqir/ui/lib/utils";
import { Reveal } from "@absqir/ui/reveal";
import { Spinner } from "@absqir/ui/spinner";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  QrCodeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useEffect } from "react";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Providers } from "@/components/providers";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { useCheckIn } from "@/mutations/use-check-in";

export interface CheckInPageProps {
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
          title="Scan the screen"
          description="This page opens from the QR code in the room. Point your phone camera at it, or open the scanner here."
        />
        <a href="/check-in" className={buttonVariants({ className: "w-full" })}>
          Open the scanner
        </a>
        <a href="/my/events" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
          My events
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
        <AuthHeading title="Not checked in" description={error.message} />
        <Button className="w-full" onClick={() => window.location.reload()}>
          <ArrowClockwiseIcon />
          Try again
        </Button>
        <a href="/check-in" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          Scan it myself
        </a>
        <a href="/my/events" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
          My events
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
            .with(true, () => `Already in, ${result.personName}`)
            .otherwise(() => `You are in, ${result.personName}`)}
          description={result.eventTitle}
        />
        <div className="border-border flex items-center gap-3 rounded-lg border p-3 text-sm">
          <AttendanceStatusBadge status={result.status} />
          <span className="text-muted-foreground tabular-nums">
            in at {formatDate(new Date(result.checkedInAt), "time")}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          You can close this page. The record is saved.
        </p>
        <a
          href="/my/events"
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          My events
        </a>
        <a href="/my/history" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
          My history
        </a>
      </Reveal>
    ))
    .otherwise(() => (
      <div className="space-y-5">
        <Mark className="bg-muted ring-muted/50">
          <Spinner className="text-muted-foreground size-6" />
        </Mark>
        <AuthHeading title="Checking you in…" description="One moment. Keep this page open." />
      </div>
    ));
}

export function CheckInPage(props: CheckInPageProps) {
  return (
    <Providers>
      <CheckInBody {...props} />
    </Providers>
  );
}
