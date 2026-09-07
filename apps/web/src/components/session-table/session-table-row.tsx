import { formatDate } from "@absqir/core/date";
import { CaretRightIcon, UsersIcon } from "@phosphor-icons/react";

export interface SessionRowData {
  id: string;
  title: string;
  active: boolean;
  createdAt: string;
  recordCount: number;
}

export interface SessionTableRowProps {
  session: SessionRowData;
}

export function SessionTableRow(props: SessionTableRowProps) {
  const { session } = props;

  return (
    <li>
      <a
        href={`/sessions/${session.id}`}
        className="hover:bg-muted/50 focus-visible:ring-ring flex items-center gap-4 p-4 focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{session.title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {formatDate(new Date(session.createdAt), "dateTime")}
          </p>
        </div>

        <span
          className={
            session.active
              ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium"
          }
        >
          {session.active ? "Open" : "Closed"}
        </span>

        <span className="text-muted-foreground flex items-center gap-1 font-mono text-xs tabular-nums">
          <UsersIcon aria-hidden />
          {session.recordCount}
        </span>

        <CaretRightIcon aria-hidden className="text-muted-foreground" />
      </a>
    </li>
  );
}
