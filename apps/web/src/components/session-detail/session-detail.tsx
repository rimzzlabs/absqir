import { Reveal } from "@absqir/ui/reveal";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { SessionDetailHeader } from "@/components/session-detail/session-detail-header";
import { SessionDetailRecords } from "@/components/session-detail/session-detail-records";
import { useAttendanceSession } from "@/queries/use-attendance-session";

export interface SessionDetailProps {
  sessionId: string;
}

function SessionDetailBody(props: SessionDetailProps) {
  const session = useAttendanceSession(props.sessionId);

  return match(session)
    .with({ isPending: true }, () => <p className="text-muted-foreground text-sm">Loading…</p>)
    .with({ isError: true, error: P.select() }, (error) => (
      <p role="alert" className="text-destructive text-sm">
        {error.message}
      </p>
    ))
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <Reveal className="space-y-8">
        <SessionDetailHeader session={data} />
        <SessionDetailRecords sessionId={data.id} />
      </Reveal>
    ))
    .otherwise(() => null);
}

export function SessionDetail(props: SessionDetailProps) {
  return (
    <Providers>
      <SessionDetailBody {...props} />
    </Providers>
  );
}
