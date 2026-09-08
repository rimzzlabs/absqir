import { formatDate } from "@absqir/core/date";
import { Button, buttonVariants } from "@absqir/ui/button";
import { Reveal } from "@absqir/ui/reveal";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Providers } from "@/components/providers";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { useCheckIn } from "@/mutations/use-check-in";

export interface CheckInPageProps {
  sessionId: string;
  /** From the scanned URL. Null when the page was opened by hand. */
  token: string | null;
}

/**
 * The page the room screen's QR code opens. Scanning is the intent, so the
 * check-in fires on load; the reader only sees the result.
 */
function CheckInBody(props: CheckInPageProps) {
  const checkIn = useCheckIn();
  const { mutate } = checkIn;

  useEffect(() => {
    if (props.token) mutate({ sessionId: props.sessionId, token: props.token });
  }, [props.sessionId, props.token, mutate]);

  if (!props.token) {
    return (
      <div className="space-y-5">
        <AuthHeading
          title="Scan the screen"
          description="This page opens from the QR code in the room. Point your phone camera at it."
        />
        <a
          href="/my/sessions"
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          My sessions
        </a>
      </div>
    );
  }

  return match(checkIn)
    .with({ isError: true, error: P.select() }, (error) => (
      <div className="space-y-5">
        <WarningCircleIcon weight="fill" className="text-destructive size-10" />
        <AuthHeading title="Not checked in" description={error.message} />
        <Button className="w-full" onClick={() => window.location.reload()}>
          Try again
        </Button>
        <a
          href="/my/sessions"
          className={buttonVariants({ variant: "ghost", className: "w-full" })}
        >
          My sessions
        </a>
      </div>
    ))
    .with({ data: P.select(P.nonNullable) }, (result) => (
      <Reveal className="space-y-5">
        <CheckCircleIcon weight="fill" className="size-10 text-emerald-500" />
        <AuthHeading
          title={
            result.already ? `Already in, ${result.personName}` : `You are in, ${result.personName}`
          }
          description={result.sessionTitle}
        />
        <div className="flex items-center gap-3 text-sm">
          <AttendanceStatusBadge status={result.status} />
          <span className="text-muted-foreground tabular-nums">
            {formatDate(new Date(result.checkedInAt), "time")}
          </span>
        </div>
        <a
          href="/my/sessions"
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          My sessions
        </a>
      </Reveal>
    ))
    .otherwise(() => <AuthHeading title="Checking you in…" description="One moment." />);
}

export function CheckInPage(props: CheckInPageProps) {
  return (
    <Providers>
      <CheckInBody {...props} />
    </Providers>
  );
}
