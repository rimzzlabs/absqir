import { Button } from "@absqir/ui/button";
import {
  DownloadSimpleIcon,
  PauseIcon,
  PlayIcon,
  QrCodeIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { SessionRowData } from "@/components/session-table/session-table-row";
import { useDeleteSession } from "@/mutations/use-delete-session";
import { useToggleSession } from "@/mutations/use-toggle-session";

export interface SessionDetailHeaderProps {
  session: SessionRowData;
}

export function SessionDetailHeader(props: SessionDetailHeaderProps) {
  const { session } = props;
  const toggle = useToggleSession();
  const remove = useDeleteSession();

  const onDelete = () => {
    // One confirm is enough: the delete removes every check-in with it.
    const sure = window.confirm(
      `Delete "${session.title}" and its ${session.recordCount} check-ins?`,
    );
    if (sure) {
      remove.mutate(session.id, { onSuccess: () => window.location.assign("/") });
    }
  };

  return (
    <header>
      <a href="/" className="text-muted-foreground hover:text-foreground text-sm">
        ← Sessions
      </a>

      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">{session.title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {session.active
          ? "Open for check-ins. Put the QR screen on the projector."
          : "Closed. Nobody can check in until you open it again."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => window.location.assign(`/sessions/${session.id}/display`)}>
          <QrCodeIcon />
          Show QR screen
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={toggle.isPending}
          onClick={() => toggle.mutate({ id: session.id, active: !session.active })}
        >
          {session.active ? <PauseIcon /> : <PlayIcon />}
          {session.active ? "Close session" : "Open session"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            window.location.assign(`/api/attendance-sessions/${session.id}/records.csv`)
          }
        >
          <DownloadSimpleIcon />
          Export CSV
        </Button>

        <Button size="sm" variant="outline" disabled={remove.isPending} onClick={onDelete}>
          <TrashIcon />
          Delete
        </Button>
      </div>

      {toggle.error || remove.error ? (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {toggle.error?.message ?? remove.error?.message}
        </p>
      ) : null}
    </header>
  );
}
