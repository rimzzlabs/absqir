import { Reveal } from "@absqir/ui/reveal";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { SessionDetailHeader } from "@/components/session-detail/session-detail-header";
import { SessionDetailRecords } from "@/components/session-detail/session-detail-records";
import { useAttendanceSessions } from "@/queries/use-attendance-sessions";

export interface SessionDetailProps {
  sessionId: string;
}

function SessionDetailBody(props: SessionDetailProps) {
  const sessions = useAttendanceSessions();

  return match(sessions)
    .with({ isPending: true }, () => <p className="text-muted-foreground text-sm">Loading…</p>)
    .with({ isError: true, error: P.select() }, (error) => (
      <p role="alert" className="text-destructive text-sm">
        {error.message}
      </p>
    ))
    .with({ data: P.select(P.nonNullable) }, (rows) => {
      const session = rows.find((row) => row.id === props.sessionId);

      if (!session) {
        return (
          <p role="alert" className="text-destructive text-sm">
            This session does not exist, or it belongs to another account.
          </p>
        );
      }

      return (
        <Reveal className="space-y-8">
          <SessionDetailHeader session={session} />
          <SessionDetailRecords sessionId={session.id} />
        </Reveal>
      );
    })
    .otherwise(() => null);
}

export function SessionDetail(props: SessionDetailProps) {
  return (
    <Providers>
      <SessionDetailBody {...props} />
    </Providers>
  );
}
