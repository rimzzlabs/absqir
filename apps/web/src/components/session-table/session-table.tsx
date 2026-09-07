import { Reveal } from "@absqir/ui/reveal";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { SessionTableCreate } from "@/components/session-table/session-table-create";
import { SessionTableRow } from "@/components/session-table/session-table-row";
import { useAttendanceSessions } from "@/queries/use-attendance-sessions";

function SessionList() {
  const sessions = useAttendanceSessions();

  return (
    <Reveal className="space-y-6">
      <SessionTableCreate />

      {match(sessions)
        .with({ isPending: true }, () => <p className="text-muted-foreground text-sm">Loading…</p>)
        .with({ isError: true, error: P.select() }, (error) => (
          <p role="alert" className="text-destructive text-sm">
            {error.message}
          </p>
        ))
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No sessions yet. Create one, then put its QR code on the projector.
            </p>
          ) : (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {rows.map((row) => (
                <SessionTableRow key={row.id} session={row} />
              ))}
            </ul>
          ),
        )
        .otherwise(() => null)}
    </Reveal>
  );
}

export function SessionTable() {
  return (
    <Providers>
      <SessionList />
    </Providers>
  );
}
