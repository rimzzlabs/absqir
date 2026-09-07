import { formatDate } from "@absqir/core/date";
import { match, P } from "ts-pattern";
import { useAttendanceRecords } from "@/queries/use-attendance-records";

export interface SessionDetailRecordsProps {
  sessionId: string;
}

export function SessionDetailRecords(props: SessionDetailRecordsProps) {
  const records = useAttendanceRecords(props.sessionId);

  return (
    <section aria-label="Check-ins">
      {match(records)
        .with({ isPending: true }, () => <p className="text-muted-foreground text-sm">Loading…</p>)
        .with({ isError: true, error: P.select() }, (error) => (
          <p role="alert" className="text-destructive text-sm">
            {error.message}
          </p>
        ))
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No check-ins yet. They appear here within a few seconds of a scan.
            </p>
          ) : (
            <div className="border-border overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-left">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">ID</th>
                    <th className="p-3 font-medium">Checked in</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="p-3">{row.name}</td>
                      <td className="p-3 font-mono text-xs">{row.identifier}</td>
                      <td className="text-muted-foreground p-3 tabular-nums">
                        {formatDate(new Date(row.checkedInAt), "dateTime")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
        )
        .otherwise(() => null)}
    </section>
  );
}
