import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { useAttendanceSession } from "@/queries/use-attendance-session";
import { useQrToken } from "@/queries/use-qr-token";

export interface QrDisplayProps {
  sessionId: string;
}

function QrScreen(props: QrDisplayProps) {
  const detail = useAttendanceSession(props.sessionId);
  const qr = useQrToken(props.sessionId);

  const session = detail.data;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      {session ? (
        <h1 className="font-serif text-3xl font-bold tracking-tight">{session.title}</h1>
      ) : null}

      {session && !session.active ? (
        <p role="status" className="text-destructive text-sm font-medium">
          This session is closed. Open it again to accept check-ins.
        </p>
      ) : null}

      {match(qr)
        .with({ isPending: true }, () => (
          <p className="text-muted-foreground text-sm">Preparing the QR code…</p>
        ))
        .with({ isError: true, error: P.select() }, (error) => (
          <p role="alert" className="text-destructive text-sm">
            {error.message}
          </p>
        ))
        .with({ data: P.select(P.nonNullable) }, (data) => (
          <>
            <img
              src={data.qrDataUrl}
              alt="QR code for checking in"
              className="border-border w-[min(80vw,60vh)] rounded-xl border bg-white p-4"
            />
            <p className="text-muted-foreground text-sm">
              Scan with your phone camera, then fill in your name and ID.
            </p>
            <p className="text-muted-foreground max-w-full truncate font-mono text-xs">
              {data.checkinUrl}
            </p>
          </>
        ))
        .otherwise(() => null)}

      <p className="text-muted-foreground text-xs">
        The code rotates every few seconds, so a photo of it stops working almost at once.
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
