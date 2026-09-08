import { formatRange } from "@absqir/core/date";
import { buttonVariants } from "@absqir/ui/button";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { SessionStatusBadge } from "@/components/shared/status-badge";
import { useQrToken } from "@/queries/use-qr-token";
import { useSession } from "@/queries/use-sessions";

export interface QrDisplayProps {
  sessionId: string;
}

/** The room screen. Big code, few words, rotates on its own. */
function QrScreen(props: QrDisplayProps) {
  const session = useSession(props.sessionId);
  const qr = useQrToken(props.sessionId);
  const data = session.data;
  const checkedIn = data ? data.counts.present + data.counts.late : 0;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <a
        href={`/sessions/${props.sessionId}`}
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "absolute top-4 left-4",
        })}
      >
        ← Back
      </a>

      {data ? (
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{data.title}</h1>
          <p className="text-muted-foreground text-sm">
            {formatRange(new Date(data.startsAt), new Date(data.endsAt))}
          </p>
          <div className="flex items-center justify-center gap-3">
            <SessionStatusBadge status={data.status} />
            <span className="text-muted-foreground text-sm tabular-nums">
              {checkedIn}/{data.counts.expected} checked in
            </span>
          </div>
        </div>
      ) : null}

      {data?.status === "scheduled" ? (
        <p role="status" className="text-muted-foreground max-w-sm text-sm">
          Check-in opens {data.opensBeforeMinutes} minutes before the start. The code below works
          only while the event runs.
        </p>
      ) : null}

      {data?.status === "done" ? (
        <p role="status" className="text-destructive text-sm font-medium">
          This event is closed.
        </p>
      ) : null}

      {match(qr)
        .with({ isPending: true }, () => (
          <p className="text-muted-foreground text-sm">Preparing the code…</p>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (token) => (
          <img
            src={token.qrDataUrl}
            alt="QR code for checking in"
            className="border-border w-[min(80vw,60vh)] rounded-2xl border bg-white p-4"
          />
        ))
        .otherwise(() => null)}

      <p className="text-muted-foreground max-w-sm text-sm">
        Scan with your phone camera, then confirm on the page that opens. Sign in first if the phone
        asks. The code changes every few seconds, so a photo of it stops working at once.
      </p>
    </div>
  );
}

export function QrDisplay(props: QrDisplayProps) {
  return (
    <Providers>
      <QrScreen {...props} />
    </Providers>
  );
}
